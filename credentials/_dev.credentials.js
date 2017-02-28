// dev credentials

let credentials = {
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
  hardcodedBanks: [['assessment.Bank%3A57d70ed471e482a74879349a%40bazzim.MIT.EDU', 'accounting'],  // FbW Accounting Fall 2016
                   ['assessment.Bank%3A576d6d3271e4828c441d721a%40bazzim.MIT.EDU', 'algebra']],  // FbW MAT121 Fall 2016
  handcar: {
    ProxyKey: 'AGENT_KEYEsHgRHv4kIUVPmnn16KIzj5pyrkiHzMotbElekzuRPmhj34moFj%2BgUAuLoymRxIx',
    Host: 'mc3-dev.mit.edu'
  },
  qbank: {
    SecretKey: 'nXyH7uMPLibmuXxbLQXxkmW2Z7hpIsbxm6eXYLDCGQ327WjU9w7FGKNx5ZzT',
    AccessKeyId: 'xSfslfEMRn3djSaCpdJB',
    Host: 'qbank-dev.mit.edu',
    SchoolNodes: {
      'acc': 'assessment.Bank%3A57279fc2e7dde08807231e61%40bazzim.MIT.EDU',
      'qcc': 'assessment.Bank%3A57279fcee7dde08832f93420%40bazzim.MIT.EDU'
    },
    Proxy: 'fbw@mit.edu'
  },
  KatexURL: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.6.0/katex.min.js',
  KatexCSS: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.6.0/katex.min.css',
  KatexAutoRender: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.6.0/contrib/auto-render.min.js',
  MathJaxURL: 'https://cdn.mathjax.org/mathjax/2.6-latest/MathJax.js?config=TeX-AMS_HTML',
  MathJaxConfig: `
    MathJax.Hub.Config({
      "HTML-CSS": { scale: 100, linebreaks: { automatic: true } },
      displayAlign: "left",
      TeX: {
        extensions: ['cancel.js']
      }
   });
 `
};

module.exports = credentials;
