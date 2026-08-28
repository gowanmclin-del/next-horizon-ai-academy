-- ============================================================================
-- Next Horizon AI Academy — AI-101 seed data (Phase 4)
-- ============================================================================
-- Run this AFTER supabase/schema.sql, against the same database.
-- This has not been executed against a live database in this environment.
--
-- Reuses dollar-quoting ($c$ ... $c$) for any text that contains
-- apostrophes (contractions like "doesn't"), to avoid manual '' escaping.
-- ============================================================================

do $$
declare
  v_course_id uuid;
  v_module_id uuid;
  v_assessment_id uuid;
  v_q uuid;
  v_o1 uuid; v_o2 uuid; v_o3 uuid; v_o4 uuid;
begin

  -- ==========================================================================
  -- Course
  -- ==========================================================================
  insert into public.courses (slug, title, short_description, description, status, certification_name)
  values (
    'ai-101',
    'AI-101: Foundations of Artificial Intelligence',
    $c$A beginner-friendly introduction to artificial intelligence.$c$,
    $c$A beginner-friendly introduction to artificial intelligence: understanding AI, generative AI, prompting, everyday productivity, and responsible use.$c$,
    'published',
    'Certified AI Foundations Professional (CAFP)'
  )
  returning id into v_course_id;

  -- ==========================================================================
  -- Module 1 — Understanding Artificial Intelligence
  -- ==========================================================================
  insert into public.modules (course_id, slug, title, description, position)
  values (v_course_id, 'understanding-artificial-intelligence', 'Understanding Artificial Intelligence', null, 1)
  returning id into v_module_id;

  insert into public.lessons (module_id, slug, title, description, content, duration_minutes, position, is_published) values
  (v_module_id, 'what-is-artificial-intelligence', 'What Is Artificial Intelligence?',
    $c$A plain-language definition of AI and why it matters now.$c$,
    $c$Artificial intelligence is software that performs tasks which normally require human thinking — recognizing patterns, generating language, making predictions, and more.

Modern AI doesn't "understand" the world the way people do. It learns statistical patterns from huge amounts of data and uses those patterns to produce useful, often impressively fluent, output.$c$,
    6, 1, true),
  (v_module_id, 'how-ai-works', 'How AI Works',
    $c$A beginner-friendly look at training data, models, and predictions.$c$,
    $c$Most AI systems are built by training a model on large datasets, letting it adjust internal parameters until it gets better at a task, like predicting the next word in a sentence.

Once trained, the model doesn't look anything up — it generates a response based on patterns it learned, which is why it can be confidently wrong as well as confidently right.$c$,
    7, 2, true),
  (v_module_id, 'types-of-artificial-intelligence', 'Types of Artificial Intelligence',
    $c$Narrow AI vs. general AI, and where today's tools fit.$c$,
    $c$Nearly all AI in use today is "narrow AI" — built for a specific kind of task, like writing, image generation, or recommendation. It has no goals or awareness outside that task.

"General AI," a system with human-like reasoning across any domain, does not exist yet. Keeping this distinction in mind helps set realistic expectations for what today's tools can and can't do.$c$,
    6, 3, true),
  (v_module_id, 'ai-in-everyday-life', 'AI in Everyday Life',
    $c$Where AI already shows up in tools you use every day.$c$,
    $c$AI already sits behind spell check, spam filters, streaming recommendations, GPS routing, photo search, and voice assistants — often invisibly.

Recognizing these everyday examples makes newer tools like chatbots and image generators feel like a continuation of something familiar, not a completely separate technology.$c$,
    5, 4, true),
  (v_module_id, 'module-1-review', 'Module Review',
    $c$Recap the core ideas from Module 1 before moving on.$c$,
    $c$You've covered what AI is, how models are trained, the difference between narrow and general AI, and where AI already shows up in daily life.

Take a moment to think of two AI tools you already use — that context will make Module 2 easier to connect to.$c$,
    4, 5, true);

  -- ==========================================================================
  -- Module 2 — Generative AI
  -- ==========================================================================
  insert into public.modules (course_id, slug, title, description, position)
  values (v_course_id, 'generative-ai', 'Generative AI', null, 2)
  returning id into v_module_id;

  insert into public.lessons (module_id, slug, title, description, content, duration_minutes, position, is_published) values
  (v_module_id, 'introduction-to-generative-ai', 'Introduction to Generative AI',
    $c$What makes generative AI different from earlier AI tools.$c$,
    $c$Generative AI creates new content — text, images, audio, video, or code — rather than just classifying or predicting a single value.

Tools like ChatGPT, Claude, Midjourney, and others fall under this umbrella. This module focuses on understanding the major categories before Module 3 covers how to prompt them effectively.$c$,
    6, 1, true),
  (v_module_id, 'large-language-models', 'Large Language Models',
    $c$How tools like ChatGPT and Claude actually generate text.$c$,
    $c$A large language model (LLM) generates text one piece at a time, predicting the most likely next word based on everything written so far, including your prompt.

This is why LLMs are fluent writers but not reliable calculators or fact databases — their core skill is language patterns, not verified lookup.$c$,
    8, 2, true),
  (v_module_id, 'ai-image-generation', 'AI Image Generation',
    $c$The basics of how text-to-image tools work.$c$,
    $c$Image generation tools learn the relationship between text descriptions and visual patterns from huge datasets of captioned images, then generate a new image that statistically matches a text prompt.

Results are often striking but can include distorted details (hands, text, symmetry) — a useful reminder that these tools are pattern generators, not photographers.$c$,
    6, 3, true),
  (v_module_id, 'ai-audio-and-video', 'AI Audio and Video',
    $c$A quick tour of AI voice, music, and video generation.$c$,
    $c$The same generative approach extends to audio (text-to-speech, voice cloning, music generation) and increasingly to video.

These tools are moving fast and raise real questions around consent and authenticity, which Module 5 covers in more depth.$c$,
    5, 4, true),
  (v_module_id, 'understanding-ai-limitations', 'Understanding AI Limitations',
    $c$Why AI tools make mistakes, and how to spot them.$c$,
    $c$AI can "hallucinate" — state incorrect information confidently and fluently, with no built-in way to signal uncertainty the way a person would.

Knowing this turns AI output into a draft to verify, not a finished answer to trust outright, especially for facts, dates, citations, or numbers.$c$,
    6, 5, true),
  (v_module_id, 'module-2-review', 'Module Review',
    $c$Recap generative AI concepts before moving to prompting.$c$,
    $c$You've covered generative AI broadly, how LLMs and image tools work, and why AI output needs verification.

Next, Module 3 turns this understanding into a practical skill: writing prompts that get better results.$c$,
    4, 6, true);

  -- ==========================================================================
  -- Module 3 — Prompting Fundamentals
  -- ==========================================================================
  insert into public.modules (course_id, slug, title, description, position)
  values (v_course_id, 'prompting-fundamentals', 'Prompting Fundamentals', null, 3)
  returning id into v_module_id;

  insert into public.lessons (module_id, slug, title, description, content, duration_minutes, position, is_published) values
  (v_module_id, 'what-is-a-prompt', 'What Is a Prompt?',
    $c$The instruction you give an AI tool, and why wording matters.$c$,
    $c$A prompt is simply the input you give an AI system — a question, instruction, or piece of text to work from. The quality of that input strongly shapes the quality of the output.

Think of prompting less like search and more like briefing a capable assistant who has no memory of your goals unless you state them.$c$,
    5, 1, true),
  (v_module_id, 'writing-clear-instructions', 'Writing Clear Instructions',
    $c$Being specific about what you actually want.$c$,
    $c$Vague prompts get vague answers. Naming the task, the audience, and the desired outcome up front dramatically improves results.

Compare "Write about marketing" to "Write a 3-sentence Instagram caption promoting a weekend coffee shop sale, in a friendly tone." The second gives the model something concrete to aim for.$c$,
    6, 2, true),
  (v_module_id, 'adding-context', 'Adding Context',
    $c$Giving the AI the background it needs to be useful.$c$,
    $c$AI tools only know what's in the conversation (plus general training data) — they don't know your business, your audience, or your goals unless you tell them.

Adding a sentence or two of context — who this is for, what's already been tried, what to avoid — often improves output more than rewording the instruction itself.$c$,
    6, 3, true),
  (v_module_id, 'roles-tone-and-format', 'Roles, Tone, and Format',
    $c$Shaping how the AI responds, not just what it says.$c$,
    $c$You can ask an AI to respond as a particular role ("as a patient teacher"), in a particular tone ("formal," "casual," "encouraging"), and in a particular format (a table, bullet points, a short paragraph).

Stacking these controls together — role, tone, and format — turns a generic answer into one shaped for your actual use case.$c$,
    6, 4, true),
  (v_module_id, 'improving-ai-responses', 'Improving AI Responses',
    $c$Iterating on an answer instead of accepting the first draft.$c$,
    $c$The first response is a starting point, not a final answer. Asking the AI to revise — shorter, more formal, with an example, cut the second paragraph — is a normal and expected part of using these tools well.

Treating it as a conversation rather than a one-shot query usually produces noticeably better results.$c$,
    5, 5, true),
  (v_module_id, 'prompting-practice', 'Prompting Practice',
    $c$Apply what you've learned with a few practice scenarios.$c$,
    $c$Try rewriting a vague request of your own using what you've learned: state the task, the audience, the tone, and the format.

Then ask the AI to revise its answer at least once. Noticing the difference a specific prompt makes is the fastest way to build this skill.$c$,
    7, 6, true),
  (v_module_id, 'module-3-review', 'Module Review',
    $c$Recap prompting fundamentals before moving to productivity use cases.$c$,
    $c$You've covered what a prompt is, how to write clear instructions, why context matters, and how to control tone, role, and format.

Module 4 puts these skills to work on everyday tasks like research, writing, and planning.$c$,
    4, 7, true);

  -- ==========================================================================
  -- Module 4 — AI for Productivity
  -- ==========================================================================
  insert into public.modules (course_id, slug, title, description, position)
  values (v_course_id, 'ai-for-productivity', 'AI for Productivity', null, 4)
  returning id into v_module_id;

  insert into public.lessons (module_id, slug, title, description, content, duration_minutes, position, is_published) values
  (v_module_id, 'research-and-brainstorming', 'Research and Brainstorming',
    $c$Using AI to explore ideas and get unstuck faster.$c$,
    $c$AI is well suited to generating options quickly — angles for an article, names for a product, questions you hadn't considered.

Because it can hallucinate facts, treat its brainstorm output as a starting list to evaluate and verify, not a finished, fact-checked research report.$c$,
    5, 1, true),
  (v_module_id, 'writing-and-communication', 'Writing and Communication',
    $c$Drafting emails, messages, and documents with AI assistance.$c$,
    $c$AI is useful for first drafts, rewrites, and tone adjustments — turning a rough set of bullet points into a clear email, or softening a message before you send it.

The judgment about what to actually say, and whether it's accurate and appropriate, still belongs to you.$c$,
    6, 2, true),
  (v_module_id, 'organization-and-planning', 'Organization and Planning',
    $c$Using AI to structure tasks, schedules, and plans.$c$,
    $c$AI can turn a messy list of to-dos into a prioritized plan, draft a project timeline, or outline the steps for a process you describe.

This works best when you give it real constraints — deadlines, available time, dependencies — the same context you'd give a human assistant.$c$,
    5, 3, true),
  (v_module_id, 'ai-for-everyday-work', 'AI for Everyday Work',
    $c$Practical use cases across common job functions.$c$,
    $c$Across roles — customer service, sales, operations, creative work — the common thread is using AI to handle a first pass quickly, then applying human review and judgment.

The specific tools vary, but this pattern of draft-then-review holds up almost everywhere.$c$,
    6, 4, true),
  (v_module_id, 'building-repeatable-ai-workflows', 'Building Repeatable AI Workflows',
    $c$Turning a good prompt into a reusable process.$c$,
    $c$Once a prompt works well for a recurring task, save it as a template you can reuse and adjust, rather than rewriting it from scratch each time.

This is how individuals and teams start to get consistent, compounding value from AI tools instead of one-off wins.$c$,
    6, 5, true),
  (v_module_id, 'module-4-review', 'Module Review',
    $c$Recap productivity applications before moving to responsible use.$c$,
    $c$You've covered research, writing, planning, everyday work use cases, and building repeatable workflows.

Module 5 shifts focus to using AI responsibly — accuracy, privacy, copyright, and bias.$c$,
    4, 6, true);

  -- ==========================================================================
  -- Module 5 — Responsible AI
  -- ==========================================================================
  insert into public.modules (course_id, slug, title, description, position)
  values (v_course_id, 'responsible-ai', 'Responsible AI', null, 5)
  returning id into v_module_id;

  insert into public.lessons (module_id, slug, title, description, content, duration_minutes, position, is_published) values
  (v_module_id, 'ai-accuracy-and-hallucinations', 'AI Accuracy and Hallucinations',
    $c$Why you should verify facts, numbers, and citations from AI.$c$,
    $c$AI models can state incorrect facts, invent citations, or misremember details with full confidence and no visible uncertainty.

The practical habit that matters most from this whole course: verify anything factual, numeric, or quotable before you rely on or repeat it.$c$,
    6, 1, true),
  (v_module_id, 'privacy-and-sensitive-information', 'Privacy and Sensitive Information',
    $c$What not to share with AI tools, and why.$c$,
    $c$Avoid pasting sensitive personal data, confidential business information, or anything you wouldn't want stored or reviewed by a third party into an AI tool, unless you understand that tool's specific data policy.

When in doubt, use placeholder names and details instead of real ones.$c$,
    6, 2, true),
  (v_module_id, 'copyright-and-ai', 'Copyright and AI',
    $c$A beginner-friendly overview of AI and intellectual property.$c$,
    $c$Copyright and AI is an evolving legal area, with open questions about training data and ownership of AI-generated output.

As a practical guideline: don't ask AI to reproduce copyrighted text or another creator's exact style for commercial use, and check the terms of the specific tool you're using.$c$,
    6, 3, true),
  (v_module_id, 'bias-and-responsible-use', 'Bias and Responsible Use',
    $c$Understanding where AI bias comes from and how to watch for it.$c$,
    $c$AI models learn from real-world data, which includes real-world biases — so output can reflect skewed assumptions about people, groups, or topics.

Reviewing AI output with a critical eye, especially for anything involving people, is part of using these tools responsibly.$c$,
    6, 4, true),
  (v_module_id, 'human-judgment-and-ai', 'Human Judgment and AI',
    $c$Keeping a person in the loop for decisions that matter.$c$,
    $c$AI is a capable assistant, not a decision-maker. For anything with real consequences — legal, medical, financial, or otherwise high-stakes — AI output should inform a human decision, not replace one.

This principle ties together everything covered in AI-101: use AI to move faster, and use your own judgment to stay accurate and responsible.$c$,
    6, 5, true),
  (v_module_id, 'module-5-review', 'Module Review',
    $c$Recap responsible AI before the final assessment.$c$,
    $c$You've covered accuracy, privacy, copyright, bias, and the role of human judgment.

You're ready for the AI-101 final assessment — a short check of what you've learned across all five modules.$c$,
    4, 6, true);

  -- ==========================================================================
  -- Final Assessment
  -- ==========================================================================
  insert into public.assessments (course_id, title, description, passing_score, is_published)
  values (
    v_course_id,
    'AI-101 Final Assessment',
    $c$A short assessment covering all five AI-101 modules. The passing score is a configurable academy value, currently set to 80%.$c$,
    80,
    true
  )
  returning id into v_assessment_id;

  -- Question 1
  insert into public.assessment_questions (assessment_id, question, position)
  values (v_assessment_id, $c$Most AI tools in use today are best described as:$c$, 1)
  returning id into v_q;
  insert into public.assessment_options (question_id, option_text, position)
  values (v_q, $c$General AI, capable of reasoning about any topic like a person$c$, 1) returning id into v_o1;
  insert into public.assessment_options (question_id, option_text, position)
  values (v_q, $c$Narrow AI, built for a specific kind of task$c$, 2) returning id into v_o2;
  insert into public.assessment_options (question_id, option_text, position)
  values (v_q, $c$Fully autonomous systems with their own goals$c$, 3) returning id into v_o3;
  insert into public.assessment_options (question_id, option_text, position)
  values (v_q, $c$Simple lookup tools with no learned patterns$c$, 4) returning id into v_o4;
  insert into public.assessment_answer_keys (question_id, correct_option_id) values (v_q, v_o2);

  -- Question 2
  insert into public.assessment_questions (assessment_id, question, position)
  values (v_assessment_id, $c$An AI "hallucination" refers to:$c$, 2)
  returning id into v_q;
  insert into public.assessment_options (question_id, option_text, position)
  values (v_q, $c$The AI displaying an image incorrectly$c$, 1) returning id into v_o1;
  insert into public.assessment_options (question_id, option_text, position)
  values (v_q, $c$A software bug that crashes the app$c$, 2) returning id into v_o2;
  insert into public.assessment_options (question_id, option_text, position)
  values (v_q, $c$The AI stating incorrect information confidently and fluently$c$, 3) returning id into v_o3;
  insert into public.assessment_options (question_id, option_text, position)
  values (v_q, $c$A prompt that is too long to process$c$, 4) returning id into v_o4;
  insert into public.assessment_answer_keys (question_id, correct_option_id) values (v_q, v_o3);

  -- Question 3
  insert into public.assessment_questions (assessment_id, question, position)
  values (v_assessment_id, $c$Which of these tends to most improve an AI's response?$c$, 3)
  returning id into v_q;
  insert into public.assessment_options (question_id, option_text, position)
  values (v_q, $c$Making the prompt as short as possible$c$, 1) returning id into v_o1;
  insert into public.assessment_options (question_id, option_text, position)
  values (v_q, $c$Adding context about the task, audience, and desired format$c$, 2) returning id into v_o2;
  insert into public.assessment_options (question_id, option_text, position)
  values (v_q, $c$Avoiding any follow-up or revision requests$c$, 3) returning id into v_o3;
  insert into public.assessment_options (question_id, option_text, position)
  values (v_q, $c$Asking the same question multiple times in a row$c$, 4) returning id into v_o4;
  insert into public.assessment_answer_keys (question_id, correct_option_id) values (v_q, v_o2);

  -- Question 4
  insert into public.assessment_questions (assessment_id, question, position)
  values (v_assessment_id, $c$For high-stakes decisions (legal, medical, financial), AI output should:$c$, 4)
  returning id into v_q;
  insert into public.assessment_options (question_id, option_text, position)
  values (v_q, $c$Replace a human decision entirely$c$, 1) returning id into v_o1;
  insert into public.assessment_options (question_id, option_text, position)
  values (v_q, $c$Never be used under any circumstances$c$, 2) returning id into v_o2;
  insert into public.assessment_options (question_id, option_text, position)
  values (v_q, $c$Inform a human decision, with a person reviewing and deciding$c$, 3) returning id into v_o3;
  insert into public.assessment_options (question_id, option_text, position)
  values (v_q, $c$Only be used if it comes with a citation$c$, 4) returning id into v_o4;
  insert into public.assessment_answer_keys (question_id, correct_option_id) values (v_q, v_o3);

  -- Question 5
  insert into public.assessment_questions (assessment_id, question, position)
  values (v_assessment_id, $c$A responsible habit when using AI-generated facts, numbers, or quotes is to:$c$, 5)
  returning id into v_q;
  insert into public.assessment_options (question_id, option_text, position)
  values (v_q, $c$Trust them automatically since AI is usually accurate$c$, 1) returning id into v_o1;
  insert into public.assessment_options (question_id, option_text, position)
  values (v_q, $c$Verify them before relying on or repeating them$c$, 2) returning id into v_o2;
  insert into public.assessment_options (question_id, option_text, position)
  values (v_q, $c$Only use them in casual conversation, never professionally$c$, 3) returning id into v_o3;
  insert into public.assessment_options (question_id, option_text, position)
  values (v_q, $c$Avoid using AI for anything factual$c$, 4) returning id into v_o4;
  insert into public.assessment_answer_keys (question_id, correct_option_id) values (v_q, v_o2);

end $$;
