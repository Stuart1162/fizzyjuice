import React, { useEffect, useState } from 'react';
import {
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import FacebookIcon from '@mui/icons-material/Facebook';
import EmailIcon from '@mui/icons-material/Email';
import InstagramIcon from '@mui/icons-material/Instagram';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { PortableText } from '@portabletext/react';
import type { PortableTextReactComponents, PortableTextMarkComponentProps } from '@portabletext/react';
import type { TypedObject } from '@portabletext/types';
import '../styles/community-post.css';
import {
  CommunityPost as CommunityPostType,
  CommunityPostSummary,
  CommunityPostFact,
  CommunityResourceLink,
} from '../types/sanity';
import { fetchCommunityPost, fetchCommunityPosts } from '../services/sanityQueries';
import { urlFor } from '../services/sanityClient';

const formatDate = (iso?: string) => {
  if (!iso) return null;
  return new Intl.DateTimeFormat('en-GB', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(iso));
};

type PortableLinkMark = TypedObject & {
  href?: string;
};

const portableTextComponents: Partial<PortableTextReactComponents> = {
  marks: {
    highlight: ({ children }: PortableTextMarkComponentProps) => (
      <span style={{ backgroundColor: '#ffecb3', padding: '0 4px' }}>{children}</span>
    ),
    link: ({ children, value }: PortableTextMarkComponentProps<PortableLinkMark>) => (
      <a href={value?.href || '#'} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
  },
};

const ShareIcon = ({ path, ...props }: { path: string } & SvgIconProps) => (
  <SvgIcon {...props}>
    <path d={path} />
  </SvgIcon>
);

const shareTargets = [
  {
    label: 'LinkedIn',
    icon: <LinkedInIcon fontSize="small" />,
    buildHref: (url: string, title: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  },
  {
    label: 'X',
    icon: (
      <ShareIcon
        fontSize="small"
        path="M22.46 6c-.77.35-1.6.58-2.46.69a4.24 4.24 0 0 0 1.85-2.34 8.4 8.4 0 0 1-2.68 1.02 4.22 4.22 0 0 0-7.34 2.88c0 .33.04.65.11.96-3.51-.18-6.63-1.85-8.72-4.4a4.2 4.2 0 0 0-.57 2.12 4.22 4.22 0 0 0 1.88 3.52 4.2 4.2 0 0 1-1.91-.53v.05c0 2.02 1.44 3.71 3.35 4.1a4.25 4.25 0 0 1-1.9.07 4.23 4.23 0 0 0 3.95 2.94 8.47 8.47 0 0 1-5.24 1.8c-.34 0-.67-.02-1-.06a11.93 11.93 0 0 0 6.46 1.89c7.75 0 11.99-6.42 11.99-11.99 0-.18-.01-.36-.02-.54A8.55 8.55 0 0 0 24 4.56a8.27 8.27 0 0 1-2.36.65A4.17 4.17 0 0 0 22.46 6Z"
      />
    ),
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
    buildHref: (url: string, title: string) => `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
  },
  {
    label: 'Instagram',
    icon: <InstagramIcon fontSize="small" />,
    buildHref: (url: string) => `https://www.instagram.com/?url=${encodeURIComponent(url)}`,
  },
];

const CommunityPost: React.FC = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<CommunityPostType | null>(null);
  const [related, setRelated] = useState<CommunityPostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedShareUrl, setShareUrl] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const loadPost = async () => {
      if (!slug) return;
      try {
        setLoading(true);
        const [data, all] = await Promise.all([fetchCommunityPost(slug), fetchCommunityPosts()]);
        if (cancelled) return;
        if (!data) {
          setError("We couldn't find that story.");
          setPost(null);
          setRelated([]);
          return;
        }
        setPost(data);
        const others = all.filter((p: CommunityPostSummary) => p.slug !== slug).slice(0, 3);
        setRelated(others);
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
            backgroundImage: `linear-gradient(180deg, rgba(5, 2, 0, 0.05) 0%, rgba(5, 2, 0, 0.8) 75%), url(${urlFor(post.heroImage)
              ?.width(2200)
              .height(1200)
              .fit('crop')
              .url() || ''})`,
          }}
        >
          <Container maxWidth="lg" className="communityPostHeroContent">
            <Typography component="h1" className="communityPostHeroTitle">
              {post.title}
            </Typography>
            {post.excerpt && <Typography className="communityPostHeroDek">{post.excerpt}</Typography>}
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
                {post.gallery.map((image: NonNullable<CommunityPostType['gallery']>[number]) => (
                  <Box key={image.asset?._ref} className="communityGalleryImage">
                    <img src={urlFor(image)?.width(800).height(600).fit('crop').url() || ''} alt={image.alt || ''} />
                    {image.caption && <Typography variant="caption">{image.caption}</Typography>}
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          <Box className="communityPostAside">
            {post.sidebarSections?.length
              ? post.sidebarSections.map((section: NonNullable<CommunityPostType['sidebarSections']>[number]) =>
                  renderSidebarSection(section)
                )
              : null}

            {post.featuredFacts && post.featuredFacts.length > 0 && (
              <Box className="communityPostCard">
                <Typography variant="subtitle2" className="communityPostCardLabel">
                  Quick facts
                </Typography>
                <Stack spacing={1.5} mt={2}>
                  {post.featuredFacts.map((fact: CommunityPostFact) => (
                    <Box key={fact._key} className="communityPostFactRow">
                      <Typography variant="body2" color="text.secondary">
                        {fact.label}
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
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
                  {post.resources.map((resource: CommunityResourceLink) => (
                    <Box key={resource._key}>
                      <Typography variant="body1" fontWeight={600}>
                        {resource.label}
                      </Typography>
                      {resource.description && (
                        <Typography variant="body2" color="text.secondary">
                          {resource.description}
                        </Typography>
                      )}
                      <Button
                        component="a"
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                      >
                        Visit link
                      </Button>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            {related.length > 0 && (
              <Box className="communityPostRelated">
                <Box className="communityRelatedList">
                  {related.map((relPost) => (
                    <Box
                      key={relPost._id}
                      component={RouterLink}
                      to={`/community/${relPost.slug}`}
                      className="communityRelatedCard"
                      style={{
                        backgroundImage: `linear-gradient(150deg, rgba(7,0,0,0.55), rgba(0,0,0,0.25)), url(${urlFor(relPost.heroImage)
                          ?.width(900)
                          .height(600)
                          .fit('crop')
                          .url() || ''})`,
                      }}
                    >
                      <Typography variant="body2">{formatDate(relPost.publishedAt) || 'Fresh drop'}</Typography>
                      <Typography variant="h6">{relPost.title}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default CommunityPost;
