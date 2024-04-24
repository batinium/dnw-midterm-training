module.exports = function (app){
app.get('/', (req, res) => {
    res.render('index.html');
  });
  
  app.get('/api', (req, res) => {
    res.json({"msg": "Hello world"});
  });
   
};