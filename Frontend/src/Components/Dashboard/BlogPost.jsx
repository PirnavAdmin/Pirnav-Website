import { Link, Navigate, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { blogPosts } from "./blogData";
import "./Blogs.css";

const BlogPost = () => {
  const { slug } = useParams();
  const post = blogPosts.find((item) => item.slug === slug);

  if (!post) {
    return <Navigate to="/blogs" replace />;
  }

  return (
    <main className="blog-post-page">
      <section className="blog-post-hero">
        <div className="blogs-shell">
          <Link to="/blogs" className="blog-post-back">
            <FaArrowLeft aria-hidden="true" />
            <span>Back to Blogs</span>
          </Link>

          <h1>{post.title}</h1>
          <p>{post.description}</p>
        </div>
      </section>

      <section className="blog-post-content-section">
        <div className="blogs-shell">
          <article className="blog-post-card">
            <div className="blog-post-image-wrap">
              <img className="blog-post-image" src={post.image} alt={post.title} />
            </div>

            <div className="blog-post-content">
              <span className="blog-post-content-kicker">Article Notes</span>
              {post.content.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
};

export default BlogPost;
