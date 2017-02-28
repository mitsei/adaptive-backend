// production credentials file

let prodCredentials = {
  d2l: {
//    appID: 'G9nUpvbZQyiPrk3um2YAkQ',
    appID: 'y5iMXv4MfnIbbJl5b26TBQ',
//    appKey: 'ybZu7fm_JKJTFwKEHfoZ7Q',
    appKey: 'iOHfuXkRWJLyciHvDHNomw',
    host: 'https://acctest.desire2learn.com',
//    host: 'https://lms.valence.desire2learn.com',
    port: 443
  },
  login: 'simple',  // simple, d2l
  hardcodedBanks: [['assessment.Bank%3A57d70ed471e482a74879349a%40bazzim.MIT.EDU', 'accounting'],  // Accounting Fall 2016, ACC
                   ['assessment.Bank%3A576d6d3271e4828c441d721a%40bazzim.MIT.EDU', 'algebra']],  // Algebra Fall 2016, ACC
  handcar: {
    ProxyKey: 'AGENT_KEYEsHgRHv4kIUVPmnn16KIzj5pyrkiHzMotbElekzuRPmhj34moFj%2BgUAuLoymRxIx',
    Host: 'mc3.mit.edu'
  },
  qbank: {
    SecretKey: 'VVPpv1yjKF8CIaZnRx0bPDWOm6UO9kyf9UYMO4SQO80L1IwyTJ41vYprev5j',
    AccessKeyId: 'xJ7oDgLzI8lLTBkW84ep',
    Host: 'qbank.mit.edu',
    SchoolNodes: {
      'acc': 'assessment.Bank%3A57279fc2e7dde08807231e61%40bazzim.MIT.EDU',
      'qcc': 'assessment.Bank%3A57279fcee7dde08832f93420%40bazzim.MIT.EDU'
    },
    Proxy: 'fbw@mit.edu'
  },
  KatexURL: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.6.0/katex.min.js',
  KatexCSS: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.6.0/katex.min.css',
  KatexAutoRender: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.6.0/contrib/auto-render.min.js',
};

module.exports = prodCredentials
