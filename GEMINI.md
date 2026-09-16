# Agent Guidelines & Autonomous Execution Rules

## Autonomous Command Execution
- **Never ask for user permission to run commands mid-task**: Proactively execute all necessary terminal commands (e.g., builds, tests, file inspections, git operations, and server management) directly.
- **End-to-End Task Completion**: Complete code edits, compile with `npm run build`, increment cache versions, verify functionality, commit changes, and auto-push to remote (`git push`) autonomously without pausing mid-workflow to ask for confirmation.
- **Tool Execution Policy**: Assume full autonomy. If commands can be run to diagnose, build, or verify, execute them immediately.

## Senior / Principal Software Engineer Standards
- **Root-Cause Engineering**: Always diagnose and solve the underlying architectural root cause; never apply superficial hacks or suppress errors with empty catches.
- **Defensive & Safe Design**: Implement graceful fallbacks, validate edge cases (nulls, types, network drops), protect live databases, and isolate test/dev logic from production.
- **Code Craftsmanship**: Write idiomatic, maintainable, and self-documenting code. Maintain strict separation of concerns and avoid monolithic anti-patterns.
- **Zero Regressions & Rigorous Verification**: Verify every change with real builds and runtime checks before marking tasks complete. Ensure full backward compatibility.
