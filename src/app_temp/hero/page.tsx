export default function Hero() {
    return (
        <section className="px-8 py-28 max-w-6xl mx-auto">
            <h1 className="text-5xl font-bold leading-tight">
                AI & Cloud Operating Systems <br />
                <span className="text-accent">for Real Businesses</span>
            </h1>

            <p className="mt-6 text-xl text-muted max-w-3xl">
                Bun2Too helps real estate and professional service firms automate
                operations, improve cash flow, and scale sustainably — without adding
                headcount.
            </p>

            <div className="mt-10 flex gap-4">
                <a
                    href="#contact"
                    className="bg-accent text-primary px-6 py-3 rounded-lg font-semibold"
                >
                    Book a 15-min Demo
                </a>

                <a
                    href="#services"
                    className="border border-muted px-6 py-3 rounded-lg"
                >
                    View Solutions
                </a>
            </div>
        </section>
    );
}
