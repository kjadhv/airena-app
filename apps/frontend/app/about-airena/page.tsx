export default function AboutAirena() {
  return (
    <section className="min-h-screen bg-black text-white px-6 md:px-20 py-16">
      <div className="max-w-5xl mx-auto space-y-12">

        {/* Title */}
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            What is Airena?
          </h1>
          <p className="text-gray-300 text-lg">
            Airena is a next-generation gaming and sports streaming platform
            built for creators, gamers, and fans who want more than just
            watching — they want to compete, connect, and grow.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-zinc-900 p-6 rounded-xl">
            <h3 className="text-xl font-bold mb-2">🎮 Gaming Streams</h3>
            <p className="text-gray-400">
              Stream competitive gaming, tournaments, and live gameplay with
              real engagement.
            </p>
          </div>

          <div className="bg-zinc-900 p-6 rounded-xl">
            <h3 className="text-xl font-bold mb-2">🏆 Sports & Events</h3>
            <p className="text-gray-400">
              Broadcast live sports, esports events, and real-time competitions.
            </p>
          </div>

          <div className="bg-zinc-900 p-6 rounded-xl">
            <h3 className="text-xl font-bold mb-2">💬 Creator Community</h3>
            <p className="text-gray-400">
              Build your audience, connect with fans, and grow your brand.
            </p>
          </div>
        </div>

        {/* How to Start Streaming */}
        <div>
          <h2 className="text-3xl font-bold mb-6">
            How to Start Streaming on Airena
          </h2>

          <ol className="space-y-4 text-gray-300 list-decimal list-inside">
            <li>Create an Airena account</li>
            <li>Apply to become a creator</li>
            <li>Get approval from our team</li>
            <li>Set up your streaming software</li>
            <li>Go live and start building your audience</li>
          </ol>
        </div>

        {/* CTA */}
        <div className="pt-6">
          <a
            href="/creator/apply"
            className="inline-block bg-gradient-to-r from-amber-500 to-pink-500 px-8 py-4 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg"
          >
            Apply to Become a Creator 🚀
          </a>
        </div>

      </div>
    </section>
  );
}
