const express = require('express');
const app = express();
const MongoClient = require('mongodb').MongoClient;


const passport = require('passport');
const localStrategy = require('passport-local').Strategy; // 인증하는 방법을 Strategy 라고 지칭한다.
const session = require('express-session');

app.set('view engine', 'ejs');


app.use(session({secret : 'secretnumber', resave : true, saveUninitialized : false}));
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static('public'));   // css 사용

app.use(express.urlencoded({extended: true}))


// id 를 이용하여 세션 저장 및 쿠키 발행 (로그인 성공 시)
passport.serializeUser(function(user, done){
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const result = await db.collection('login').findOne({ id: id });
        done(null, result);
    } catch (error) {
        done(error, null);
    }
});


var db;

MongoClient.connect('mongodb+srv://seohyun:0118@database.ppmgg9t.mongodb.net/?retryWrites=true&w=majority')
.then(client => {

    db = client.db('test');  // 위에 then 이랑 맞춰야 하는 듯??

    /*db.collection('test').insertOne({name : 'seohyun', age : 22}, function(err, result){
        // 정상적으로 자료가 추가되었다면 console 에 '저장 완료' 문구 띄우기
        console.log('저장 완료');
    });*/
    

    app.listen(4000, () => {
        console.log(`Example app listening on port ${4000}`);
    });
    
   // post = db.collection('posts'); 이거 왜 있지? 그리고 collection 도 test여야함
})
.catch(err => {
    console.log(err);
    return;
});

/*.finally(() => {
    console.log('끝');
})*/



// 누군가가 / 경로에 접속하면
app.get('/', function(req, res){
    // index.html 이라는 파일을 보낸다.
    res.render('index.ejs')
})

app.get('/write', function(req, res){
    res.render('write.ejs');
});

app.get('/login', function(req, res){
    res.render('login.ejs');
})

app.get('/loginsuccess', function(req, res){
    res.render('loginsuccess.ejs');
})

app.get('/signup', function(req, res){
    res.render('signup.ejs');
})

app.get('/loginfail',function(req,res){
    res.render('loginfail.ejs')
})

app.get('/writefail',function(req,res){
    res.render('login.ejs')
})




app.post('/add', async function(req, res){
    try {
        // 1. 로그인 체크
        if (!req.user || !req.user._id) {
            res.redirect('/writefail');
            //res.status(401).send('로그인이 필요합니다.');
            return;
        }

        // 2. 데이터 작성
        var submitData = {
            작성자: req.user._id,
            이름: req.body.name,
            내용: req.body.message
        }

        // 3. 데이터 검증
        if (!submitData.이름 || !submitData.내용) {
            res.status(400).send('이름과 내용을 모두 제공해야 합니다.');
            return;
        }

        // 4. MongoDB에 데이터 저장
        const result = await db.collection('test').insertOne(submitData);
        console.log('데이터 저장 완료!', result);
        res.redirect('/list');
    } catch (error) {
        // 5. 에러 핸들링
        console.error('데이터 저장 중 에러:', error);
        res.status(500).send('데이터 저장 중 에러가 발생했습니다.');
    }
});





// 로그인 페이지에서 db에 저장된 정보와 id,pw 비교 후 인증
app.post('/login', passport.authenticate('local', {failureRedirect : '/loginfail' }), function(req, res){
    res.redirect('/loginsuccess'); // login 을 성공하면 / 경로로, 실패하면 /fail 경로로 이동한다.
})

// 로그인 성공 시
app.post('/loginsuccess', function(req, res){
    res.redirect('/');
})

// 로그인 실패 시
app.post('/loginfail', function(req, res){
    res.redirect('/login');
})

// 글쓰기, 로그인 권한 없을 때
app.post('/writefail', function(req, res){
    res.redirect('/');
})

// 회원가입
app.post('/signup', async function(req, res) {
    try {
        // 폼에 입력된 데이터가 db.collection 중 login 컬렉션에 저장
        const result = await db.collection('login').insertOne({ id: req.body.id, pw: req.body.pw });

        // 성공적으로 삽입되면 로그를 출력
        console.log('아이디 패스워드 정보 저장 완료');

        // 회원가입 성공 후 로그인 페이지로 리다이렉트
        res.redirect('/login');
    } catch (error) {
        // 삽입 중 오류가 발생하면 오류를 콘솔에 기록
        console.error('Error inserting document:', error);
        // 오류 발생 시 에러 페이지로 리다이렉트 또는 다른 처리를 수행할 수 있습니다.
        res.redirect('/error');
    }
});




// 누군가가 /list 경로로 GET 요청을 하면
app.get('/list', async function(req, res) {
    try {
        const result = await db.collection('test').find().toArray();
        console.log(result);
        res.render('list.ejs', { posts: result });
    } catch (error) {
        console.error(error);
        // 에러 처리 로직을 여기에 추가하세요.
        res.status(500).send('Internal Server Error');
    }
});

// * delete
// 누군가가 삭제 버튼을 클릭하여 /delete 로 DELETE 요청을 하면

const { ObjectId } = require('mongodb');

app.delete('/delete', async function(req, res) {
    try {
        // 클라이언트에서 전송한 _id 값을 ObjectId로 변환
        const postId = new ObjectId(req.body._id);

        var delData={_id: postId, 작성자: req.user._id}
        // DB에서 게시글 삭제하기
        const result = await db.collection('test').deleteOne(delData);

        // 삭제된 문서가 없을 경우 에러 응답
        if (result.deletedCount === 0) {
            return res.status(404).send({ message: '삭제할 게시물을 찾을 수 없습니다.' });
        }

        console.log('게시물 삭제 완료');
        // 성공 응답
        res.status(200).send({ message: '성공했습니다.' });
    } catch (err) {
        console.error('게시물 삭제 중 오류:', err);
        // 에러 응답
        console.error('삭제 권한이 없습니다.');
    }
});



const LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy({
    usernameField: 'id',
    passwordField: 'pw',
    session: true,
    passReqToCallback: false,
}, async function(inputId, inputPw, done) {
    try {
        const result = await db.collection('login').findOne({ id: inputId });

        if (!result) {
            return done(null, false, { message: '존재하지 않는 아이디입니다.' });
        }

        if (inputPw == result.pw) {
            return done(null, result);
        } else {
            return done(null, false, { message: '비밀번호가 다릅니다.' });
        }
    } catch (err) {
        return done(err);
    }
}));

