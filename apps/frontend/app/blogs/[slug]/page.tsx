import { db } from "@/app/firebase/firebaseAdmin";
import { notFound } from "next/navigation";
import Header from "@/app/components/Sidebar";
import Footer from "@/app/components/Footer";
import AppImage from "@/app/components/AppImage";
import { Timestamp } from "firebase-admin/firestore";
import ViewCounter from "@/app/components/ViewCounter"; // <-- Import the new component
import { Calendar, User, Eye } from "lucide-react";

// Define the shape of the post data
interface Post {
  id: string;
  title: string;
  authorName: string;
  createdAt: Date;
  imageUrl: string;
  content: string;
  views?: number; // <-- Added views
}

// Updated params to be a Promise
export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const snapshot = await db
    .collection("posts")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snapshot.empty) {
    notFound();
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  
  const createdAtTimestamp = data.createdAt as Timestamp;
  
  const post: Post = {
    id: doc.id,
    title: data.title,
    authorName: data.authorName || 'Airena',
    createdAt: createdAtTimestamp.toDate(),
    imageUrl: data.imageUrl,
    content: data.content,
    views: data.views || 0, // <-- Fetch views
  };

  return (
    <div className="bg-transparent">
      <Header />
      <main className="pt-24 pb-16 min-h-screen">
        <article className="container mx-auto px-4 max-w-4xl">
          {/* Call the client component to trigger the view count */}
          <ViewCounter postId={post.id} />

          <div className="relative w-full h-64 md:h-96 mb-8 rounded-2xl overflow-hidden shadow-lg shadow-black/20">
            <AppImage
              src={post.imageUrl}
              alt={post.title}
              className="object-cover"
              fallbackText={post.title}
            />
          </div>
          
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-white">
              {post.title}
            </h1>
            <div className="flex items-center justify-center flex-wrap gap-x-6 gap-y-2 text-md text-gray-400">
                <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{post.authorName}</span>
                </div>
                 <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                        {post.createdAt.toLocaleDateString("en-US", {
                          year: "numeric", month: "long", day: "numeric",
                        })}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>{post.views?.toLocaleString() || '0'} views</span>
                </div>
            </div>
          </div>
          
          <div
            className="prose prose-invert prose-lg max-w-none 
                       prose-p:text-gray-300 prose-p:leading-relaxed
                       prose-h2:text-emerald-400 prose-h2:font-semibold
                       prose-blockquote:border-emerald-500 prose-blockquote:bg-emerald-500/10
                       prose-li:text-gray-300"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

        </article>
      </main>
      <Footer />
    </div>
  );
}