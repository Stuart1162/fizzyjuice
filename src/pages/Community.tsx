import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, CircularProgress, Container, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import '../styles/community.css';
import { CommunityCategory, CommunityPostSummary } from '../types/sanity';
import { fetchCommunityCategories, fetchCommunityPosts } from '../services/sanityQueries';
import { urlFor } from '../services/sanityClient';

const formatDate = (iso?: string) => {
  if (!iso) return null;
  return new Intl.DateTimeFormat('en-GB', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(iso));
};

const Community: React.FC = () => {
  const [posts, setPosts] = useState<CommunityPostSummary[]>([]);
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const showFilters = false;

  useEffect(() => {
    let cancelled = false;
    const loadPosts = async () => {
      try {
        setLoading(true);
        const [postData, categoryData] = await Promise.all([fetchCommunityPosts(), fetchCommunityCategories()]);
        if (!cancelled) {
          setPosts(postData);
          setCategories(categoryData);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Unable to load community stories right now.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void loadPosts();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPosts = useMemo(() => {
    if (selectedCategory === 'all') return posts;
    return posts.filter((post: CommunityPostSummary) =>
      (post.categories || []).some((category: CommunityCategory) => category.slug === selectedCategory)
    );
  }, [posts, selectedCategory]);

  return (
    <Box className="communityPage">
      <Container maxWidth="lg" className="communityContainer">
        <Box className="communityIntro">
          <Typography variant="h2" component="h1" className="communityTitle">
            Community
          </Typography>
          <Box className="communityActions">
            <Typography component="span" className="communityActionsLabel">
              Share your story
            </Typography>
            <Stack direction="row" spacing={3} className="communityActionsLinks">
              <Typography
                component="a"
                href="https://tally.so/r/MeJXkp"
                target="_blank"
                rel="noopener noreferrer"
                className="communityActionLink"
              >
                Employer
              </Typography>
              <Typography
                component="a"
                href="https://tally.so/r/WOM2xN"
                target="_blank"
                rel="noopener noreferrer"
                className="communityActionLink"
              >
                Community Spotlight
              </Typography>
            </Stack>
          </Box>
        </Box>

        {showFilters && categories.length > 0 && (
          <Stack direction="row" spacing={1} className="communityFilters" flexWrap="wrap" justifyContent="center">
            <Chip
              label="All"
              clickable
              onClick={() => setSelectedCategory('all')}
              className={`communityFilterChip ${selectedCategory === 'all' ? 'communityFilterChip--active' : ''}`}
            />
            {categories.map((category: CommunityCategory) => (
              <Chip
                key={category._id}
                label={category.title}
                clickable
                onClick={() => setSelectedCategory(category.slug || '')}
                className={`communityFilterChip ${selectedCategory === category.slug ? 'communityFilterChip--active' : ''}`}
                style={
                  selectedCategory === category.slug && category.themeColor
                    ? { backgroundColor: category.themeColor, color: '#fff' }
                    : undefined
                }
              />
            ))}
          </Stack>
        )}

        {loading ? (
          <Box className="communityState">
            <CircularProgress color="inherit" />
            <Typography variant="body1">Decanting the latest stories…</Typography>
          </Box>
        ) : error ? (
          <Box className="communityState">
            <Typography variant="body1" color="error">
              {error}
            </Typography>
            <Button variant="outlined" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </Box>
        ) : posts.length === 0 ? (
          <Box className="communityState">
            <Typography variant="body1">No community posts yet. Check back soon!</Typography>
          </Box>
        ) : filteredPosts.length === 0 ? (
          <Box className="communityState">
            <Typography variant="body1">No stories in this category yet. Try another filter.</Typography>
          </Box>
        ) : (
          <Box className="communityGrid">
            {filteredPosts.map((post) => (
              <Box key={post._id} className="communityGridItem">
                <Box
                  component={RouterLink}
                  to={`/community/${post.slug}`}
                  className="communityCard"
                  style={{
                    backgroundImage: `url(${urlFor(post.heroImage)
                      ?.width(1200)
                      .height(900)
                      .fit('crop')
                      .url() || ''})`,
                  }}
                >
                  <Typography variant="subtitle2" className="communityCardDate">
                    {formatDate(post.publishedAt) || 'Fresh drop'}
                  </Typography>
                  <Typography component="span" className="communityCardHeading">
                    {post.title}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default Community;
