import { Link } from "react-router-dom";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import "./Blogs.css";
import { blogPosts } from "./blogData";

const Blogs = () => {
  return (
    <main className="blogs-page">
      <section className="blogs-hero">
        <div className="blogs-shell">
          <Link to="/#blogs" className="blogs-back-link" aria-label="Back to dashboard blogs">
            <FaArrowLeft aria-hidden="true" />
            <span>Back</span>
          </Link>

          <div className="blogs-heading-row">
            <span className="blogs-kicker">Field Notes</span>
            <h1>Ideas that move with the work.</h1>
            <p>
              Short reads on support, cloud, testing and security, arranged for
              quick scanning and deeper reading.
            </p>
          </div>
        </div>
      </section>

      <section className="blogs-list-section">
        <div className="blogs-shell">
          <div className="blogs-story-list">
            {blogPosts.map((post, index) => (
              <article
                key={post.title}
                className="blogs-story"
                style={{ "--story-index": index }}
              >
                <Link to={`/blogs/${post.slug}`} className="blogs-story-image">
                  <img src={post.image} alt={post.title} />
                </Link>

                <div className="blogs-story-content">
                  <span className="blogs-story-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="blogs-card-meta">
                    <span>{post.category}</span>
                    <span>{post.readTime}</span>
                  </div>
                  <h2>
                    <Link to={`/blogs/${post.slug}`}>{post.title}</Link>
                  </h2>
                  <p>{post.description}</p>

                  <Link to={`/blogs/${post.slug}`} className="blogs-card-link">
                    Open Article <FaArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default Blogs;
