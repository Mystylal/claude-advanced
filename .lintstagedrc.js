const path = require("path");

function forWorkspace(workspaceDir) {
  return (filenames) => {
    const relativeFiles = filenames.map((file) =>
      path.relative(path.join(__dirname, workspaceDir), file),
    );
    return `sh -c "cd ${workspaceDir} && npx eslint --fix ${relativeFiles.join(" ")}"`;
  };
}

module.exports = {
  "apps/web/**/*.{js,jsx,ts,tsx}": forWorkspace("apps/web"),
  "apps/api/**/*.ts": forWorkspace("apps/api"),
};
