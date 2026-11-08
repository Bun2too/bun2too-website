import { motion } from "framer-motion";

export default function Home() {
  return (
    <main className="text-center py-20 px-4">
      <h2 className="text-5xl font-bold mb-6 fade-in">Innovating AI, Securing Fintech, Empowering Cybersecurity</h2>
      <p className="mt-2 text-lg text-lightGray max-w-3xl mx-auto">
        Building trust through intelligent solutions in the modern digital world.
      </p>
      <button className="mt-6 bg-warmOrange hover:bg-boldRed transition-colors duration-300 text-white px-6 py-3 rounded text-lg">
          Get Started
      </button>

      {/* Feature Section */}
      <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      viewport={{ once: true }}
      className="bg-deepBlue p-6 rounded-lg shadow-lg"
      >
      <img src="/icons/ai.svg" alt="AI" className="h-12 mb-4" />
      <h3 className="text-xl font-semibold text-warmOrange">Artificial Intelligence</h3>
      <p className="text-lightGray mt-2">Smart insights for bold decisions.</p>
      </motion.div>
      <section className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto text-left">
        <div className="bg-deepBlue p-6 rounded-lg shadow-lg hover:scale-105 hover:shadow-2xl transition-transform duration-300 ease-in-out">
          <img src="/icons/ai.svg" alt="AI" className="h-12 mb-4" />
          <h3 className="text-xl font-semibold text-warmOrange">Artificial Intelligence</h3>
          <p className="text-lightGray mt-2">
            Deploy cutting-edge machine learning for real-time insights and decision-making.
          </p>
        </div>
        <div className="bg-deepBlue p-6 rounded-lg shadow-lg hover:scale-105 hover:shadow-2xl transition-transform duration-300 ease-in-out">
          <img src="/icons/fintech.svg" alt="Fintech" className="h-12 mb-4" />
          <h3 className="text-xl font-semibold text-warmOrange">Fintech Solutions</h3>
          <p className="text-lightGray mt-2">
            Seamless digital finance products tailored for efficiency and security.
          </p>
        </div>
        <div className="bg-deepBlue p-6 rounded-lg shadow-lg hover:scale-105 hover:shadow-2xl transition-transform duration-300 ease-in-out">
          <img src="/icons/cybersec.svg" alt="Cybersecurity" className="h-12 mb-4" />
          <h3 className="text-xl font-semibold text-warmOrange">Cybersecurity</h3>
          <p className="text-lightGray mt-2">
            Defend your assets with enterprise-grade protection and blockchain integrity.
          </p>
        </div>
      </section>
    </main>
  );
}
