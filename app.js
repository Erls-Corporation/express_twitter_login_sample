
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var app = express();

var oauth = new (require('oauth').OAuth)(
  'https://api.twitter.com/oauth/request_token',
  'https://api.twitter.com/oauth/access_token',
  'CONSUMER KEY',
  'CONSUMER SECRET',
  '1.0',
  'http://127.0.0.1:3000/auth/twitter/callback',
  'HMAC-SHA1'
);

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(function(req, res, next) {
    res.locals.session = req.session;
    next();
  });
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/users', user.list);

app.get('/auth/twitter', function(req, res) {
  oauth.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results) {
    if(error) {
      res.send(error);
    } else {
      req.session.oauth = {};
      req.session.oauth.token = oauth_token;
      req.session.oauth.token_secret = oauth_token_secret;
      res.redirect('https://twitter.com/oauth/authenticate?oauth_token=' + oauth_token);
    }
  });
});

app.get('/auth/twitter/callback', function(req, res) {
  if(req.session.oauth) {
    req.session.oauth.verifier = req.query.oauth_verifier;

    oauth.getOAuthAccessToken(
      req.session.oauth.token, req.session.oauth.token_secret, req.session.oauth.verifier, 
      function(error, oauth_access_token, oauth_access_token_secret, results) {
        if(error) {
          res.send(error);
        } else {
          req.session.oauth.access_token = oauth_access_token;
          req.session.oauth.access_token_secret = oauth_access_token_secret;
          req.session.user_profile = results;
          res.redirect('/');
        }
      }
    );
  }
});

app.get('/signout', function(req, res) {
  delete req.session.oauth;
  delete req.session.user_profile;
  res.redirect('/');
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
