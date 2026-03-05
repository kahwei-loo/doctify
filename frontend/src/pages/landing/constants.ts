import { FileText, Database, MessageSquare, Bot, Upload, Sparkles, Search } from "lucide-react";

export const features = [
  {
    icon: FileText,
    title: "AI-Powered OCR",
    description:
      "Extract text from documents with multi-provider AI fallback for maximum accuracy.",
    tech: "GPT-4V + Claude + Gemini",
    gradient: "from-blue-500 to-landing-accent",
  },
  {
    icon: Database,
    title: "Knowledge Base",
    description: "Organize documents into searchable knowledge bases with vector embeddings.",
    tech: "pgvector + Cohere reranking",
    gradient: "from-landing-teal to-emerald-400",
  },
  {
    icon: MessageSquare,
    title: "RAG Q&A",
    description:
      "Ask questions and get AI answers grounded in your documents with source citations.",
    tech: "Groundedness verification",
    gradient: "from-landing-accent to-purple-400",
  },
  {
    icon: Bot,
    title: "AI Assistants",
    description: "Build custom assistants with system prompts, KB binding, and embeddable widgets.",
    tech: "System prompts + widget embed",
    gradient: "from-landing-rose to-orange-400",
  },
];

export const steps = [
  {
    number: 1,
    icon: Upload,
    title: "Upload",
    description: "PDF, PNG, JPG, TIFF",
  },
  {
    number: 2,
    icon: Sparkles,
    title: "Extract",
    description: "Multi-AI OCR pipeline",
  },
  {
    number: 3,
    icon: Search,
    title: "Organize",
    description: "Knowledge bases + embeddings",
  },
  {
    number: 4,
    icon: MessageSquare,
    title: "Ask",
    description: "RAG with citations",
  },
];

export const footerLinks = {
  product: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Knowledge Base", href: "/knowledge-base" },
    { label: "AI Assistants", href: "/assistants" },
    { label: "RAG Q&A", href: "/rag" },
  ],
  resources: [
    { label: "Documentation", href: "#" },
    { label: "API Reference", href: "#" },
    { label: "Try Demo", href: "#demo" },
  ],
  developer: [
    {
      label: "GitHub",
      href: "https://github.com/kahwei-loo",
      external: true,
    },
    { label: "Tech Stack", href: "#features" },
  ],
};
