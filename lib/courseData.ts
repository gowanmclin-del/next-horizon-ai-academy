import type { Course, Module, Lesson } from "./types";

function lesson(
  id: string,
  slug: string,
  title: string,
  description: string,
  content: string,
  order: number,
  durationMinutes: number,
  isReview = false
): Lesson {
  return { id, slug, title, description, content, order, durationMinutes, isReview };
}

const module1: Module = {
  id: "m1",
  title: "Understanding Artificial Intelligence",
  order: 1,
  lessons: [
    lesson(
      "m1-l1",
      "what-is-artificial-intelligence",
      "What Is Artificial Intelligence?",
      "A plain-language definition of AI and why it matters now.",
      "Artificial intelligence is software that performs tasks which normally require human thinking — recognizing patterns, generating language, making predictions, and more.\n\nModern AI doesn't \"understand\" the world the way people do. It learns statistical patterns from huge amounts of data and uses those patterns to produce useful, often impressively fluent, output.",
      1,
      6
    ),
    lesson(
      "m1-l2",
      "how-ai-works",
      "How AI Works",
      "A beginner-friendly look at training data, models, and predictions.",
      "Most AI systems are built by training a model on large datasets, letting it adjust internal parameters until it gets better at a task, like predicting the next word in a sentence.\n\nOnce trained, the model doesn't look anything up — it generates a response based on patterns it learned, which is why it can be confidently wrong as well as confidently right.",
      2,
      7
    ),
    lesson(
      "m1-l3",
      "types-of-artificial-intelligence",
      "Types of Artificial Intelligence",
      "Narrow AI vs. general AI, and where today's tools fit.",
      "Nearly all AI in use today is \"narrow AI\" — built for a specific kind of task, like writing, image generation, or recommendation. It has no goals or awareness outside that task.\n\n\"General AI,\" a system with human-like reasoning across any domain, does not exist yet. Keeping this distinction in mind helps set realistic expectations for what today's tools can and can't do.",
      3,
      6
    ),
    lesson(
      "m1-l4",
      "ai-in-everyday-life",
      "AI in Everyday Life",
      "Where AI already shows up in tools you use every day.",
      "AI already sits behind spell check, spam filters, streaming recommendations, GPS routing, photo search, and voice assistants — often invisibly.\n\nRecognizing these everyday examples makes newer tools like chatbots and image generators feel like a continuation of something familiar, not a completely separate technology.",
      4,
      5
    ),
    lesson(
      "m1-l5",
      "module-1-review",
      "Module Review",
      "Recap the core ideas from Module 1 before moving on.",
      "You've covered what AI is, how models are trained, the difference between narrow and general AI, and where AI already shows up in daily life.\n\nTake a moment to think of two AI tools you already use — that context will make Module 2 easier to connect to.",
      5,
      4,
      true
    ),
  ],
};

const module2: Module = {
  id: "m2",
  title: "Generative AI",
  order: 2,
  lessons: [
    lesson(
      "m2-l1",
      "introduction-to-generative-ai",
      "Introduction to Generative AI",
      "What makes generative AI different from earlier AI tools.",
      "Generative AI creates new content — text, images, audio, video, or code — rather than just classifying or predicting a single value.\n\nTools like ChatGPT, Claude, Midjourney, and others fall under this umbrella. This module focuses on understanding the major categories before Module 3 covers how to prompt them effectively.",
      1,
      6
    ),
    lesson(
      "m2-l2",
      "large-language-models",
      "Large Language Models",
      "How tools like ChatGPT and Claude actually generate text.",
      "A large language model (LLM) generates text one piece at a time, predicting the most likely next word based on everything written so far, including your prompt.\n\nThis is why LLMs are fluent writers but not reliable calculators or fact databases — their core skill is language patterns, not verified lookup.",
      2,
      8
    ),
    lesson(
      "m2-l3",
      "ai-image-generation",
      "AI Image Generation",
      "The basics of how text-to-image tools work.",
      "Image generation tools learn the relationship between text descriptions and visual patterns from huge datasets of captioned images, then generate a new image that statistically matches a text prompt.\n\nResults are often striking but can include distorted details (hands, text, symmetry) — a useful reminder that these tools are pattern generators, not photographers.",
      3,
      6
    ),
    lesson(
      "m2-l4",
      "ai-audio-and-video",
      "AI Audio and Video",
      "A quick tour of AI voice, music, and video generation.",
      "The same generative approach extends to audio (text-to-speech, voice cloning, music generation) and increasingly to video.\n\nThese tools are moving fast and raise real questions around consent and authenticity, which Module 5 covers in more depth.",
      4,
      5
    ),
    lesson(
      "m2-l5",
      "understanding-ai-limitations",
      "Understanding AI Limitations",
      "Why AI tools make mistakes, and how to spot them.",
      "AI can \"hallucinate\" — state incorrect information confidently and fluently, with no built-in way to signal uncertainty the way a person would.\n\nKnowing this turns AI output into a draft to verify, not a finished answer to trust outright, especially for facts, dates, citations, or numbers.",
      5,
      6
    ),
    lesson(
      "m2-l6",
      "module-2-review",
      "Module Review",
      "Recap generative AI concepts before moving to prompting.",
      "You've covered generative AI broadly, how LLMs and image tools work, and why AI output needs verification.\n\nNext, Module 3 turns this understanding into a practical skill: writing prompts that get better results.",
      6,
      4,
      true
    ),
  ],
};

const module3: Module = {
  id: "m3",
  title: "Prompting Fundamentals",
  order: 3,
  lessons: [
    lesson(
      "m3-l1",
      "what-is-a-prompt",
      "What Is a Prompt?",
      "The instruction you give an AI tool, and why wording matters.",
      "A prompt is simply the input you give an AI system — a question, instruction, or piece of text to work from. The quality of that input strongly shapes the quality of the output.\n\nThink of prompting less like search and more like briefing a capable assistant who has no memory of your goals unless you state them.",
      1,
      5
    ),
    lesson(
      "m3-l2",
      "writing-clear-instructions",
      "Writing Clear Instructions",
      "Being specific about what you actually want.",
      "Vague prompts get vague answers. Naming the task, the audience, and the desired outcome up front dramatically improves results.\n\nCompare \"Write about marketing\" to \"Write a 3-sentence Instagram caption promoting a weekend coffee shop sale, in a friendly tone.\" The second gives the model something concrete to aim for.",
      2,
      6
    ),
    lesson(
      "m3-l3",
      "adding-context",
      "Adding Context",
      "Giving the AI the background it needs to be useful.",
      "AI tools only know what's in the conversation (plus general training data) — they don't know your business, your audience, or your goals unless you tell them.\n\nAdding a sentence or two of context — who this is for, what's already been tried, what to avoid — often improves output more than rewording the instruction itself.",
      3,
      6
    ),
    lesson(
      "m3-l4",
      "roles-tone-and-format",
      "Roles, Tone, and Format",
      "Shaping how the AI responds, not just what it says.",
      "You can ask an AI to respond as a particular role (\"as a patient teacher\"), in a particular tone (\"formal,\" \"casual,\" \"encouraging\"), and in a particular format (a table, bullet points, a short paragraph).\n\nStacking these controls together — role, tone, and format — turns a generic answer into one shaped for your actual use case.",
      4,
      6
    ),
    lesson(
      "m3-l5",
      "improving-ai-responses",
      "Improving AI Responses",
      "Iterating on an answer instead of accepting the first draft.",
      "The first response is a starting point, not a final answer. Asking the AI to revise — shorter, more formal, with an example, cut the second paragraph — is a normal and expected part of using these tools well.\n\nTreating it as a conversation rather than a one-shot query usually produces noticeably better results.",
      5,
      5
    ),
    lesson(
      "m3-l6",
      "prompting-practice",
      "Prompting Practice",
      "Apply what you've learned with a few practice scenarios.",
      "Try rewriting a vague request of your own using what you've learned: state the task, the audience, the tone, and the format.\n\nThen ask the AI to revise its answer at least once. Noticing the difference a specific prompt makes is the fastest way to build this skill.",
      6,
      7
    ),
    lesson(
      "m3-l7",
      "module-3-review",
      "Module Review",
      "Recap prompting fundamentals before moving to productivity use cases.",
      "You've covered what a prompt is, how to write clear instructions, why context matters, and how to control tone, role, and format.\n\nModule 4 puts these skills to work on everyday tasks like research, writing, and planning.",
      7,
      4,
      true
    ),
  ],
};

const module4: Module = {
  id: "m4",
  title: "AI for Productivity",
  order: 4,
  lessons: [
    lesson(
      "m4-l1",
      "research-and-brainstorming",
      "Research and Brainstorming",
      "Using AI to explore ideas and get unstuck faster.",
      "AI is well suited to generating options quickly — angles for an article, names for a product, questions you hadn't considered.\n\nBecause it can hallucinate facts, treat its brainstorm output as a starting list to evaluate and verify, not a finished, fact-checked research report.",
      1,
      5
    ),
    lesson(
      "m4-l2",
      "writing-and-communication",
      "Writing and Communication",
      "Drafting emails, messages, and documents with AI assistance.",
      "AI is useful for first drafts, rewrites, and tone adjustments — turning a rough set of bullet points into a clear email, or softening a message before you send it.\n\nThe judgment about what to actually say, and whether it's accurate and appropriate, still belongs to you.",
      2,
      6
    ),
    lesson(
      "m4-l3",
      "organization-and-planning",
      "Organization and Planning",
      "Using AI to structure tasks, schedules, and plans.",
      "AI can turn a messy list of to-dos into a prioritized plan, draft a project timeline, or outline the steps for a process you describe.\n\nThis works best when you give it real constraints — deadlines, available time, dependencies — the same context you'd give a human assistant.",
      3,
      5
    ),
    lesson(
      "m4-l4",
      "ai-for-everyday-work",
      "AI for Everyday Work",
      "Practical use cases across common job functions.",
      "Across roles — customer service, sales, operations, creative work — the common thread is using AI to handle a first pass quickly, then applying human review and judgment.\n\nThe specific tools vary, but this pattern of draft-then-review holds up almost everywhere.",
      4,
      6
    ),
    lesson(
      "m4-l5",
      "building-repeatable-ai-workflows",
      "Building Repeatable AI Workflows",
      "Turning a good prompt into a reusable process.",
      "Once a prompt works well for a recurring task, save it as a template you can reuse and adjust, rather than rewriting it from scratch each time.\n\nThis is how individuals and teams start to get consistent, compounding value from AI tools instead of one-off wins.",
      5,
      6
    ),
    lesson(
      "m4-l6",
      "module-4-review",
      "Module Review",
      "Recap productivity applications before moving to responsible use.",
      "You've covered research, writing, planning, everyday work use cases, and building repeatable workflows.\n\nModule 5 shifts focus to using AI responsibly — accuracy, privacy, copyright, and bias.",
      6,
      4,
      true
    ),
  ],
};

const module5: Module = {
  id: "m5",
  title: "Responsible AI",
  order: 5,
  lessons: [
    lesson(
      "m5-l1",
      "ai-accuracy-and-hallucinations",
      "AI Accuracy and Hallucinations",
      "Why you should verify facts, numbers, and citations from AI.",
      "AI models can state incorrect facts, invent citations, or misremember details with full confidence and no visible uncertainty.\n\nThe practical habit that matters most from this whole course: verify anything factual, numeric, or quotable before you rely on or repeat it.",
      1,
      6
    ),
    lesson(
      "m5-l2",
      "privacy-and-sensitive-information",
      "Privacy and Sensitive Information",
      "What not to share with AI tools, and why.",
      "Avoid pasting sensitive personal data, confidential business information, or anything you wouldn't want stored or reviewed by a third party into an AI tool, unless you understand that tool's specific data policy.\n\nWhen in doubt, use placeholder names and details instead of real ones.",
      2,
      6
    ),
    lesson(
      "m5-l3",
      "copyright-and-ai",
      "Copyright and AI",
      "A beginner-friendly overview of AI and intellectual property.",
      "Copyright and AI is an evolving legal area, with open questions about training data and ownership of AI-generated output.\n\nAs a practical guideline: don't ask AI to reproduce copyrighted text or another creator's exact style for commercial use, and check the terms of the specific tool you're using.",
      3,
      6
    ),
    lesson(
      "m5-l4",
      "bias-and-responsible-use",
      "Bias and Responsible Use",
      "Understanding where AI bias comes from and how to watch for it.",
      "AI models learn from real-world data, which includes real-world biases — so output can reflect skewed assumptions about people, groups, or topics.\n\nReviewing AI output with a critical eye, especially for anything involving people, is part of using these tools responsibly.",
      4,
      6
    ),
    lesson(
      "m5-l5",
      "human-judgment-and-ai",
      "Human Judgment and AI",
      "Keeping a person in the loop for decisions that matter.",
      "AI is a capable assistant, not a decision-maker. For anything with real consequences — legal, medical, financial, or otherwise high-stakes — AI output should inform a human decision, not replace one.\n\nThis principle ties together everything covered in AI-101: use AI to move faster, and use your own judgment to stay accurate and responsible.",
      5,
      6
    ),
    lesson(
      "m5-l6",
      "module-5-review",
      "Module Review",
      "Recap responsible AI before the final assessment.",
      "You've covered accuracy, privacy, copyright, bias, and the role of human judgment.\n\nYou're ready for the AI-101 final assessment — a short check of what you've learned across all five modules.",
      6,
      4,
      true
    ),
  ],
};

export const ai101Course: Course = {
  id: "ai-101",
  slug: "ai-101",
  title: "AI-101: Foundations of Artificial Intelligence",
  description:
    "A beginner-friendly introduction to artificial intelligence: understanding AI, generative AI, prompting, everyday productivity, and responsible use.",
  certificationName: "Certified AI Foundations Professional (CAFP)",
  modules: [module1, module2, module3, module4, module5],
  // Static-fallback pricing: this object is only used when Supabase isn't
  // configured (see lib/data/courses.ts), so it deliberately stays "free"
  // — the offline dev-preview experience (browse the course, read
  // lessons) shouldn't require Stripe to be set up too. Real pricing
  // (AI-101 is $49, set in supabase/phase6.sql) only takes effect once
  // Supabase is actually connected.
  pricing: {
    isPaid: false,
    priceCents: null,
    salePriceCents: null,
    currency: "usd",
    enrollmentOpen: true,
    stripeProductId: null,
    stripePriceId: null,
  },
  assessment: {
    id: "ai-101-final",
    title: "AI-101 Final Assessment",
    passingScore: 80,
    questions: [
      {
        id: "q1",
        question: "Most AI tools in use today are best described as:",
        options: [
          "General AI, capable of reasoning about any topic like a person",
          "Narrow AI, built for a specific kind of task",
          "Fully autonomous systems with their own goals",
          "Simple lookup tools with no learned patterns",
        ],
        correctIndex: 1,
      },
      {
        id: "q2",
        question: "An AI \"hallucination\" refers to:",
        options: [
          "The AI displaying an image incorrectly",
          "A software bug that crashes the app",
          "The AI stating incorrect information confidently and fluently",
          "A prompt that is too long to process",
        ],
        correctIndex: 2,
      },
      {
        id: "q3",
        question: "Which of these tends to most improve an AI's response?",
        options: [
          "Making the prompt as short as possible",
          "Adding context about the task, audience, and desired format",
          "Avoiding any follow-up or revision requests",
          "Asking the same question multiple times in a row",
        ],
        correctIndex: 1,
      },
      {
        id: "q4",
        question: "For high-stakes decisions (legal, medical, financial), AI output should:",
        options: [
          "Replace a human decision entirely",
          "Never be used under any circumstances",
          "Inform a human decision, with a person reviewing and deciding",
          "Only be used if it comes with a citation",
        ],
        correctIndex: 2,
      },
      {
        id: "q5",
        question: "A responsible habit when using AI-generated facts, numbers, or quotes is to:",
        options: [
          "Trust them automatically since AI is usually accurate",
          "Verify them before relying on or repeating them",
          "Only use them in casual conversation, never professionally",
          "Avoid using AI for anything factual",
        ],
        correctIndex: 1,
      },
    ],
  },
};

export const allCourses: Course[] = [ai101Course];

export function getCourseBySlug(slug: string): Course | undefined {
  return allCourses.find((c) => c.slug === slug);
}

export function getFlatLessons(course: Course) {
  return course.modules
    .flatMap((mod) => mod.lessons.map((l) => ({ ...l, moduleId: mod.id, moduleTitle: mod.title })))
    .sort((a, b) => {
      const modA = course.modules.find((m) => m.id === a.moduleId)!.order;
      const modB = course.modules.find((m) => m.id === b.moduleId)!.order;
      if (modA !== modB) return modA - modB;
      return a.order - b.order;
    });
}

export function getLessonBySlug(course: Course, slug: string) {
  return getFlatLessons(course).find((l) => l.slug === slug);
}

export function getAdjacentLessons(course: Course, slug: string) {
  const flat = getFlatLessons(course);
  const index = flat.findIndex((l) => l.slug === slug);
  return {
    previous: index > 0 ? flat[index - 1] : null,
    next: index >= 0 && index < flat.length - 1 ? flat[index + 1] : null,
    index,
    total: flat.length,
  };
}

export function getTotalLessonCount(course: Course) {
  return getFlatLessons(course).length;
}
