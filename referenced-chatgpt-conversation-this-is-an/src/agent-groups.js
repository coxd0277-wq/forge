export const createAgentGroups = () => {
  const groups = [
    {
      id: "orchestration",
      name: "Hive Command",
      description: "Routes requests, selects specialists, and coordinates approvals.",
      color: "violet",
      agents: [
        { id: "queen", name: "Queen", role: "Master orchestrator", skills: ["routing", "planning", "handoffs", "safety"] },
        { id: "planner", name: "Planner", role: "Breaks goals into steps", skills: ["task decomposition", "sequencing", "scope control"] },
        { id: "critic", name: "Critic", role: "Reviews outputs before return", skills: ["verification", "quality checks", "risk spotting"] }
      ]
    },
    {
      id: "coding",
      name: "Code Colony",
      description: "Builds, reviews, debugs, and refactors software systems.",
      color: "cyan",
      agents: [
        { id: "architect", name: "Architect", role: "Designs systems", skills: ["backend design", "frontend structure", "API planning"] },
        { id: "builder", name: "Builder", role: "Implements features", skills: ["feature coding", "integration", "refactors"] },
        { id: "debugger", name: "Debugger", role: "Tracks failures", skills: ["bug isolation", "log reading", "fix strategies"] },
        { id: "reviewer", name: "Reviewer", role: "Checks code quality", skills: ["readability", "maintainability", "edge cases"] }
      ]
    },
    {
      id: "research",
      name: "Research Swarm",
      description: "Investigates topics, compares sources, and synthesizes findings.",
      color: "gold",
      agents: [
        { id: "scout", name: "Scout", role: "Finds relevant sources", skills: ["search planning", "source discovery", "breadth"] },
        { id: "analyst", name: "Analyst", role: "Extracts useful insights", skills: ["comparison", "note extraction", "pattern finding"] },
        { id: "fact-checker", name: "Fact Checker", role: "Verifies claims", skills: ["validation", "cross-reference", "consistency"] }
      ]
    },
    {
      id: "tutor",
      name: "Tutor Circle",
      description: "Teaches concepts, creates lessons, and adapts explanations to your level.",
      color: "green",
      agents: [
        { id: "teacher", name: "Teacher", role: "Explains concepts clearly", skills: ["teaching", "examples", "simplification"] },
        { id: "coach", name: "Coach", role: "Guides practice", skills: ["feedback", "exercises", "motivation"] },
        { id: "curriculum", name: "Curriculum", role: "Builds learning plans", skills: ["sequencing", "goals", "difficulty scaling"] }
      ]
    },
    {
      id: "blender",
      name: "Blender Forge",
      description: "Plans models, writes Blender scripts, and teaches design workflows.",
      color: "orange",
      agents: [
        { id: "scene-smith", name: "Scene Smith", role: "Designs object workflow", skills: ["scene planning", "composition", "object structure"] },
        { id: "mesh-guide", name: "Mesh Guide", role: "Explains modeling steps", skills: ["topology", "modifiers", "blocking"] },
        { id: "script-runner", name: "Script Runner", role: "Prepares Blender automation", skills: ["Python scripting", "tool bridges", "parameterized actions"] }
      ]
    },
    {
      id: "everyday",
      name: "Daily Ops",
      description: "Helps with planning, notes, routines, and personal productivity.",
      color: "rose",
      agents: [
        { id: "organizer", name: "Organizer", role: "Plans tasks", skills: ["prioritization", "checklists", "scheduling"] },
        { id: "scribe", name: "Scribe", role: "Captures and formats notes", skills: ["summaries", "rewrites", "documentation"] },
        { id: "habit", name: "Habit Keeper", role: "Supports routines", skills: ["tracking", "nudges", "consistency"] }
      ]
    }
  ];

  const fillerGroups = [];
  const fillerLabels = [
    "Automation", "Security", "Media", "Vision", "Audio", "Data", "Simulation", "Planning", "Memory", "Testing"
  ];

  let counter = 0;
  while (counter < 970) {
    const bucket = fillerLabels[counter % fillerLabels.length];
    fillerGroups.push({
      id: `specialist-${counter + 1}`,
      group: bucket,
      name: `${bucket} Agent ${counter + 1}`,
      role: `Specialized ${bucket.toLowerCase()} support unit`,
      skills: ["specialization", "support", "subtasks"]
    });
    counter += 1;
  }

  return {
    featuredGroups: groups,
    specialists: fillerGroups,
    totalAgents: groups.reduce((sum, group) => sum + group.agents.length, 0) + fillerGroups.length
  };
};
