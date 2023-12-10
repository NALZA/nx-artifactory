const { getJestProjects } = require('@nx/jest');

export default { projects: [...getJestProjects(), '<rootDir>/e2e/nx-artifactory-cache-e2e'] };
