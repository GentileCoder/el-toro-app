var firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "gentilecoder.firebaseapp.com",
  projectId: "gentilecoder"
};

firebase.initializeApp(firebaseConfig);
var fbAuth = firebase.auth();

fbAuth.onAuthStateChanged(function(user) {
  if (user) {
    user.getIdTokenResult(true).then(function(result) {
      console.log('Auth claims:', result.claims);
      window.authToken = result.token;
      window.userRole = result.claims.role || '';
      window.authUser = user;
      setInterval(function() {
        user.getIdToken(true).then(function(t) { window.authToken = t; });
      }, 55 * 60 * 1000);
      ge('loginOverlay').style.display = 'none';
      ge('appContainer').style.display = '';
      applyRoleVisibility();
      init();
    });
  } else {
    window.authToken = null;
    window.userRole = null;
    ge('loginOverlay').style.display = 'flex';
    ge('appContainer').style.display = 'none';
  }
});

function handleLoginSubmit() {
  var email = ge('loginEmail').value.trim();
  var pass = ge('loginPass').value;
  ge('loginError').textContent = '';
  ge('loginBtn').disabled = true;
  fbAuth.signInWithEmailAndPassword(email, pass)
    .catch(function() {
      ge('loginError').textContent = 'Email o contraseña incorrectos';
      ge('loginBtn').disabled = false;
    });
}

function handleLogout() {
  fbAuth.signOut().then(function() { location.reload(); });
}

function applyRoleVisibility() {
  var role = window.userRole;
  var isAdmin = role === 'admin';
  var isStaff = role === 'staff';

  ge('tab-btn-reservations').style.display = (isAdmin || isStaff) ? '' : 'none';
  ge('tab-btn-articulos').style.display = isAdmin ? '' : 'none';
  ge('tab-btn-historial').style.display = (isAdmin || isStaff) ? '' : 'none';
  ge('tab-btn-plan').style.display = isAdmin ? '' : 'none';
  ge('tab-btn-usuarios').style.display = isAdmin ? '' : 'none';

  ge('cobrarBtn').style.display = (isAdmin || isStaff) ? '' : 'none';
  ge('configurarBtn').style.display = isAdmin ? '' : 'none';

  if (role === 'springer') {
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.content').forEach(function(c) { c.classList.remove('active'); });
    ge('tab-btn-mesas').classList.add('active');
    ge('tab-mesas').classList.add('active');
  }
}
