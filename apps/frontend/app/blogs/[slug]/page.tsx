import { notFound } from "next/navigation";
import Header from "@/app/components/Sidebar";
import Footer from "@/app/components/Footer";
import AppImage from "@/app/components/AppImage";
import { Timestamp } from "firebase-admin/firestore";
import ViewCounter from "@/app/components/ViewCounter";
import { Calendar, User, Eye } from "lucide-react";
import { db } from "@/app/firebase/firebaseAdmin";

// Define the shape of the post data
interface Post {
  id: string;
  title: string;
  authorName: string;
  createdAt: Date;
  imageUrl: string;
  content: string;
  views?: number;
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
    views: data.views || 0,
  };

  return (
    <div className="bg-transparent relative">
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-800 z-50">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
          style={{
            width: '0%',
          }}
          id="reading-progress"
        />
      </div>
      
      <Header />
      <main className="pt-24 pb-16 min-h-screen flex justify-center">
        <article className="w-full max-w-4xl px-4 md:px-6 lg:px-8">
          {/* Call the client component to trigger the view count */}
          <ViewCounter postId={post.id} />

          <div className="relative w-full h-64 md:h-96 mb-8 rounded-2xl overflow-hidden shadow-2xl shadow-black/30 ring-1 ring-gray-700/50">
            <AppImage
              src={post.imageUrl}
              alt={post.title}
              className="object-cover"
              fallbackText={post.title}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>
          
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-white bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              {post.title}
            </h1>
            <div className="flex items-center justify-center flex-wrap gap-x-6 gap-y-2 text-md text-gray-400">
                <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-full backdrop-blur-sm">
                    <User className="w-4 h-4 text-emerald-400" />
                    <span>{post.authorName}</span>
                </div>
                 <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-full backdrop-blur-sm">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>
                        {post.createdAt.toLocaleDateString("en-US", {
                          year: "numeric", month: "long", day: "numeric",
                        })}
                    </span>
                </div>
                <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-full backdrop-blur-sm">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <span>{post.views?.toLocaleString() || '0'} views</span>
                </div>
            </div>
          </div>
          
          <div
            className="prose prose-invert prose-xl max-w-none mx-auto blog-content-rendered
                       prose-p:text-gray-200 prose-p:leading-[1.9] prose-p:text-[1.125rem] prose-p:mb-6
                       prose-h1:!text-emerald-400 prose-h1:!font-extrabold prose-h1:!text-5xl prose-h1:!leading-tight prose-h1:!mt-12 prose-h1:!mb-6 prose-h1:!tracking-tight
                       prose-h2:!text-emerald-400 prose-h2:!font-bold prose-h2:!text-4xl prose-h2:!mt-16 prose-h2:!mb-5 prose-h2:!tracking-tight
                       prose-h3:!text-emerald-300 prose-h3:!font-semibold prose-h3:!text-3xl prose-h3:!mt-12 prose-h3:!mb-4
                       prose-headings:!text-emerald-400
                       prose-blockquote:!border-l-4 prose-blockquote:!border-emerald-500 prose-blockquote:!bg-gradient-to-r prose-blockquote:!from-emerald-500/20 prose-blockquote:!via-emerald-500/10 prose-blockquote:!to-transparent
                       prose-blockquote:!italic prose-blockquote:!text-gray-100 prose-blockquote:!pl-8 prose-blockquote:!py-6 prose-blockquote:!my-8 prose-blockquote:!rounded-r-xl prose-blockquote:!shadow-lg
                       prose-li:text-gray-200 prose-li:leading-relaxed prose-li:mb-3
                       prose-ul:!my-6 prose-ol:!my-6
                       prose-a:!text-emerald-400 prose-a:!font-medium prose-a:!no-underline prose-a:!border-b-2 prose-a:!border-emerald-400/30 hover:prose-a:!text-emerald-300 hover:prose-a:!border-emerald-300
                       prose-strong:!text-white prose-strong:!font-bold
                       prose-code:!bg-gray-800/80 prose-code:!text-emerald-400 prose-code:!px-2 prose-code:!py-1 prose-code:!rounded-md prose-code:!text-base prose-code:!font-mono prose-code:!border prose-code:!border-gray-700
                       prose-pre:!bg-gradient-to-br prose-pre:!from-slate-900 prose-pre:!to-slate-800 prose-pre:!border-2 prose-pre:!border-gray-700 prose-pre:!shadow-2xl prose-pre:!my-8 prose-pre:!rounded-xl
                       prose-img:!rounded-2xl prose-img:!shadow-2xl prose-img:!my-12 prose-img:!border-2 prose-img:!border-gray-700/50
                       prose-table:!mx-auto prose-table:!shadow-2xl prose-table:!rounded-xl prose-table:!my-10
                       prose-hr:!border-t-2 prose-hr:!border-gray-700 prose-hr:!my-16 prose-hr:!opacity-50"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

        </article>
      </main>
      <Footer />
      
      {/* Reading progress script */}
      <script dangerouslySetInnerHTML={{ __html: `
        window.addEventListener('scroll', () => {
          const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
          const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
          const scrolled = (winScroll / height) * 100;
          const progressBar = document.getElementById('reading-progress');
          if (progressBar) {
            progressBar.style.width = scrolled + '%';
          }
        });
      `}} />
    </div>
  );
}