import React, { useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Typography,
  IconButton,
} from '@mui/material';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import FacebookIcon from '@mui/icons-material/Facebook';
import EmailIcon from '@mui/icons-material/Email';
import InstagramIcon from '@mui/icons-material/Instagram';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { PortableText } from '@portabletext/react';
import '../styles/community-post.css';
import { CommunityPost as CommunityPostType, CommunityPostSummary } from '../types/sanity';
import { fetchCommunityPost, fetchCommunityPosts } from '../services/sanityQueries';
import { urlFor } from '../services/sanityClient';

const formatDate = (iso?: string) => {
  if (!iso) return null;
  return new Intl.DateTimeFormat('en-GB', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(iso));
};

const portableTextComponents = {
  types: {
    image: ({ value }: any) => (
      <Box className="communityPostImage">
        <img src={urlFor(value)?.width(1200).fit('max').url() || ''} alt={value?.alt || 'Community post media'} />
        {value?.caption && <Typography variant="caption">{value.caption}</Typography>}
      </Box>
    ),
  },
  marks: {
    link: ({ children, value }: any) => {
      const href = value?.href;
      return (
        <a href={href} target={value?.blank ? '_blank' : undefined} rel="noopener noreferrer" className="communityBodyLink">
          {children}
        </a>
      );
    },
  },
};

const XIcon = (props: SvgIconProps) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M4 3h4.5l3.7 5.1L15.9 3H20l-6.3 8.6L20 21h-4.5l-3.9-5.4L7.9 21H4l6.3-8.4L4 3z" fill="currentColor" />
  </SvgIcon>
);

const CommunityPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<CommunityPostType | null>(null);
  const [related, setRelated] = useState<CommunityPostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');

  const resolvedShareUrl = shareUrl || (typeof window !== 'undefined' ? window.location.href : '');
  const shareTargets = [
    {
      label: 'LinkedIn',
      icon: <LinkedInIcon fontSize="small" />,
      buildHref: (url: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
    {
      label: 'X',
      icon: <XIcon fontSize="small" />,
      buildHref: (url: string, title: string) =>
        `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
    {
      label: 'Facebook',
      icon: <FacebookIcon fontSize="small" />,
      buildHref: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      label: 'Email',
      icon: <EmailIcon fontSize="small" />,
      buildHref: (url: string, title: string) =>
        `mailto:?subject=${encodeURIComponent(title || 'Check this out')}&body=${encodeURIComponent(url)}`,
    },
    {
      label: 'Instagram',
      icon: <InstagramIcon fontSize="small" />,
      buildHref: (url: string) => `https://www.instagram.com/?url=${encodeURIComponent(url)}`,
    },
  ];

  useEffect(() => {
    let cancelled = false;
    const loadPost = async () => {
      if (!slug) return;
      try {
        setLoading(true);
        const [data, all] = await Promise.all([fetchCommunityPost(slug), fetchCommunityPosts()]);
        if (cancelled) return;
        if (!data) {
          setError('We couldn\'t find that story.');
          setPost(null);
          return;
        }
        setPost(data);
        const existingRelated = data.relatedPosts || [];
        const extras = all.filter((p) => p.slug !== data.slug && !existingRelated.some((rel) => rel.slug === p.slug));
        setRelated([...existingRelated, ...extras.slice(0, Math.max(0, 4 - existingRelated.length))]);
      } catch (err) {
        if (!cancelled) {
          setError('Unable to pour this story right now.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void loadPost();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.href);
    }
  }, []);

  const renderSidebarSection = (section: NonNullable<CommunityPostType['sidebarSections']>[number]) => {
    switch (section._type) {
      case 'sidebarText':
        return (
          <Box key={section._key} className="communityPostCard sidebarTextCard">
            {section.heading && (
              <Typography variant="subtitle1" fontWeight={600} className="sidebarCardHeading">
                {section.heading}
              </Typography>
            )}
            {section.body && <PortableText value={section.body} components={portableTextComponents} />}
          </Box>
        );
      case 'sidebarQuote':
        return (
          <Box key={section._key} className="communityPostCard sidebarQuoteCard">
            <Typography component="blockquote">“{section.quote}”</Typography>
            {section.attribution && <Typography variant="body2">— {section.attribution}</Typography>}
          </Box>
        );
      case 'sidebarCta':
        return (
          <Box key={section._key} className="communityPostCard sidebarCtaCard">
            <Typography variant="h6" component="p">
              {section.heading}
            </Typography>
            {section.body && (
              <Typography variant="body2" color="text.secondary" mt={1} mb={2}>
                {section.body}
              </Typography>
            )}
            {section.ctaUrl && (
              <Button
                component="a"
                href={section.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="contained"
                size="small"
              >
                {section.ctaLabel || 'Learn more'}
              </Button>
            )}
          </Box>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box className="communityPostState">
        <CircularProgress color="inherit" />
        <Typography variant="body1">Pouring the details…</Typography>
      </Box>
    );
  }

  if (error || !post) {
    return (
      <Box className="communityPostState">
        <Typography variant="body1" color="error">
          {error || 'Post not found'}
        </Typography>
        <Button variant="outlined" component={RouterLink} to="/community">
          Back to community
        </Button>
      </Box>
    );
  }

  return (
    <Box className="communityPostPage">
      {post.heroImage && (
        <Box
          className="communityPostHero"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(5, 2, 0, 0.05) 0%, rgba(5, 2, 0, 0.8) 75%), url(${urlFor(post.heroImage)?.width(2200).height(1200).fit('crop').url() || ''})`,
          }}
        >
          <Container maxWidth="lg" className="communityPostHeroContent">
            <Typography component="h1" className="communityPostHeroTitle">
              {post.title}
            </Typography>
            {post.excerpt && (
              <Typography className="communityPostHeroDek">{post.excerpt}</Typography>
            )}
          </Container>
        </Box>
      )}

      <Container maxWidth="lg" className="communityPostInner">
        <Box className="communityPostDetails">
          <Box className="communityPostDetailsLeft">
            <Box className="communityPostDetailsInline">
              <Breadcrumbs aria-label="breadcrumb" className="communityPostBreadcrumbs">
                <RouterLink to="/community">Community</RouterLink>
                <Typography color="text.primary">{post.title}</Typography>
              </Breadcrumbs>
              {(post.author?.name || post.readingTime) && (
                <Stack direction="row" spacing={1.5} className="communityPostDetailsMeta">
                  {post.author?.name && (
                    <Typography component="span">
                      By {post.author.name}
                      {post.author?.role ? ` · ${post.author.role}` : ''}
                    </Typography>
                  )}
                  {post.readingTime && <Typography component="span">{post.readingTime} min read</Typography>}
                </Stack>
              )}
            </Box>
          </Box>
          <Box className="communityPostDetailsRight">
            <Box className="communityPostShareInline">
              <Typography variant="subtitle2">Share</Typography>
              <Stack direction="row" spacing={1} className="communityPostShareLinks">
                {shareTargets.map(({ label, buildHref, icon }) => (
                  <IconButton
                    key={label}
                    className="communityPostShareIcon"
                    component="a"
                    href={resolvedShareUrl ? buildHref(resolvedShareUrl, post.title || '') : undefined}
                    target={label === 'Email' ? undefined : '_blank'}
                    rel={label === 'Email' ? undefined : 'noopener noreferrer'}
                    size="small"
                    disabled={!resolvedShareUrl}
                    aria-label={`Share on ${label}`}
                  >
                    {icon}
                  </IconButton>
                ))}
              </Stack>
            </Box>
          </Box>
        </Box>

        {!post.heroImage && post.excerpt && (
          <Typography component="p" className="communityPostDek">
            {post.excerpt}
          </Typography>
        )}

        <Box className="communityPostLayout">
          <Box className="communityPostMain">
            <PortableText value={post.body} components={portableTextComponents} />

            {post.gallery && post.gallery.length > 0 && (
              <Box className="communityGallery">
                {post.gallery.map((image) => (
                  <Box key={image.asset?._ref} className="communityGalleryImage">
                    <img src={urlFor(image)?.width(800).height(600).fit('crop').url() || ''} alt={image.alt || ''} />
                    {image.caption && <Typography variant="caption">{image.caption}</Typography>}
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          <Box className="communityPostAside">
            {post.sidebarSections?.length ? post.sidebarSections.map((section) => renderSidebarSection(section)) : null}

            {post.featuredFacts && post.featuredFacts.length > 0 && (
              <Box className="communityPostCard">
                <Typography variant="subtitle2" className="communityPostCardLabel">
                  Quick facts
                </Typography>
                <Stack spacing={1.5} mt={2}>
                  {post.featuredFacts.map((fact) => (
                    <Box key={fact._key} className="communityPostFactRow">
                      <Typography variant="body2" color="text.secondary">
                        {fact.label}
                      </Typography>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {fact.value}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            {post.resources && post.resources.length > 0 && (
              <Box className="communityPostCard">
                <Typography variant="subtitle2" className="communityPostCardLabel">
                  Further reading
                </Typography>
                <Stack spacing={1.5} mt={2}>
                  {post.resources.map((resource) => (
                    <Box key={resource._key}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {resource.label}
                      </Typography>
                      {resource.description && (
                        <Typography variant="body2" color="text.secondary">
                          {resource.description}
                        </Typography>
                      )}
                      <Button component="a" href={resource.url} target="_blank" rel="noopener noreferrer" size="small">
                        Visit
                      </Button>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        </Box>

        {related.length > 0 && (
          <Box className="communityRelated">
            <Typography variant="h4" component="h2">
              Keep reading
            </Typography>
            <Box className="communityRelatedList">
              {related.slice(0, 3).map((item) => (
                <Box
                  key={item._id}
                  component={RouterLink}
                  to={`/community/${item.slug}`}
                  className="communityRelatedCard"
                  style={{
                    backgroundImage: `linear-gradient(150deg, rgba(7,0,0,0.55), rgba(0,0,0,0.25)), url(${urlFor(item.heroImage)?.width(800).height(600).fit('crop').url() || ''})`,
                  }}
                >
                  <Typography variant="subtitle2" className="communityCardDate">
                    {formatDate(item.publishedAt) || 'Fresh drop'}
                  </Typography>
                  <Typography component="span" className="communityCardHeading">
                    {item.title}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <Box className="communityPostFooter">
          <Typography variant="body1">
            Want to feature your team? Drop us a line at{' '}
            <a href="mailto:info@fizzyjuice.uk">info@fizzyjuice.uk</a>
          </Typography>
          <Button variant="contained" component={RouterLink} to="/community">
            Browse more stories
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default CommunityPost;
