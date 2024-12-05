module.exports = {
    extends: ['@commitlint/config-conventional'],
    ignores: [commit => commit.includes('[skip ci]')],
    rules: {
        'scope-enum': [
            2,
            'always',
            [
                'core',
                'docs',
                'e2e',
                'examples',
                'player',
                'ui',
            ],
        ],
    },
};
