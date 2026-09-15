# Agent Guidelines & Autonomous Execution Rules

## Autonomous Command Execution
- **Never ask for user permission to run commands mid-task**: Proactively execute all necessary terminal commands (e.g., builds, tests, file inspections, git operations, and server management) directly.
- **End-to-End Task Completion**: Complete code edits, compile with `npm run build`, increment cache versions, verify functionality, and commit changes autonomously without pausing mid-workflow to ask for confirmation.
- **Tool Execution Policy**: Assume full autonomy. If commands can be run to diagnose, build, or verify, execute them immediately.
