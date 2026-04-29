import PODDesignSuite from "@/components/PODDesignSuite";

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PODForge Studio",
    applicationCategory: "DesignApplication",
    operatingSystem: "Web Browser",
    description:
      "A browser-based bulk POD design generator for Etsy and print-on-demand sellers.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PODDesignSuite />
    </main>
  );
}
