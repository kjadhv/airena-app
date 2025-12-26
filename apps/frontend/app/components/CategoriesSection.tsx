// // app/components/CategoriesSection.tsx
// "use client";
// import React, { useState } from "react";

// const CategoriesSection = () => {
//   const [activeTab, setActiveTab] = useState<"Game" | "Sports">("Game");
//   const [activeCategory, setActiveCategory] = useState<string | null>(null);

//   const gameCategories = [
//     "Esports",
//     "Gaming",
//     "Racing",
//     "Tournaments",
//     "Streaming",
//     "Entertainment",
//   ];

//   const sportsCategories = [
//     "Football",
//     "Basketball",
//     "Tennis",
//     "Live Events",
//     "Tournaments",
//   ];

//   const categories =
//     activeTab === "Game" ? gameCategories : sportsCategories;

//   return (
//     <section className="py-8">
//       <div className="container mx-auto text-center">
//         {/* Tabs */}
//         <div className="flex justify-center items-center gap-4 mb-5">
//           <button
//             onClick={() => {
//               setActiveTab("Game");
//               setActiveCategory(null);
//             }}
//             className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors
//               ${
//                 activeTab === "Game"
//                   ? "bg-emerald-500 text-white"
//                   : "bg-gray-800 text-gray-300 hover:bg-gray-700"
//               }`}
//           >
//             Game
//           </button>

//           <button
//             onClick={() => {
//               setActiveTab("Sports");
//               setActiveCategory(null);
//             }}
//             className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors
//               ${
//                 activeTab === "Sports"
//                   ? "bg-emerald-500 text-white"
//                   : "bg-gray-800 text-gray-300 hover:bg-gray-700"
//               }`}
//           >
//             Sports
//           </button>
//         </div>

//         {/* Categories */}
//         <div className="flex flex-wrap justify-center gap-3 px-4">
//           {categories.map((cat) => (
//             <button
//               key={cat}
//               onClick={() => setActiveCategory(cat)}
//               className={`px-4 py-1.5 rounded-full text-sm transition-colors
//                 ${
//                   activeCategory === cat
//                     ? "bg-emerald-500 text-white"
//                     : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
//                 }`}
//             >
//               {cat}
//             </button>
//           ))}
//         </div>
//       </div>
//     </section>
//   );
// };

// export default CategoriesSection;
