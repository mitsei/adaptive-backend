

module.exports = {
  d2l: {
    appID: process.env.D2L_APP_ID || '',
    appKey: process.env.D2L_APP_KEY || '',
    host: process.env.D2L_HOST || 'example.com',
    port: 443
  },
  login: 'simple',  // simple, d2l
  hardcodedBanks: [['assessment.Bank%3A57d70ed471e482a74879349a%40bazzim.MIT.EDU', 'accounting'],  // Accounting Fall 2016, ACC
                   ['assessment.Bank%3A576d6d3271e4828c441d721a%40bazzim.MIT.EDU', 'algebra']],  // Algebra Fall 2016, ACC
  handcar: {
    ProxyKey: process.env.MC3_TOKEN || '',
    Host: process.env.MC3_HOST || 'example.com'
  },
  qbank: {
    SecretKey: process.env.QBANK_SECRET || '',
    AccessKeyId: process.env.QBANK_ACCESS_ID || '',
    Host: process.env.QBANK_HOST || 'example.com',
    SchoolNodes: {
      'acc': 'assessment.Bank%3A57279fc2e7dde08807231e61%40bazzim.MIT.EDU',
      'qcc': 'assessment.Bank%3A57279fcee7dde08832f93420%40bazzim.MIT.EDU'
    },
    Proxy: process.env.QBANK_PROXY || ''
  },
  KatexURL: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.6.0/katex.min.js',
  KatexCSS: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.6.0/katex.min.css',
  KatexAutoRender: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.6.0/contrib/auto-render.min.js',
};
