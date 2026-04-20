function renderUsuarios() {
  var el = ge('tab-usuarios');
  el.innerHTML = '<div class="toolbar"><button class="btn-primary" onclick="openAddUserModal()">+ Usuario</button></div><div id="userList"><div style="color:#666;font-size:13px">Cargando...</div></div>';
  loadUsers();
}

function loadUsers() {
  fetch(WORKER_URL + '/users', {
    headers: { 'Authorization': 'Bearer ' + window.authToken }
  })
  .then(function(r) { return r.json(); })
  .then(function(users) { renderUserList(users); })
  .catch(function() {
    ge('userList').innerHTML = '<div style="color:#e87c7c;font-size:13px">Error al cargar usuarios</div>';
  });
}

function renderUserList(users) {
  var el = ge('userList');
  if (!users.length) {
    el.innerHTML = '<div style="color:#666;font-size:13px">Sin usuarios</div>';
    return;
  }
  el.innerHTML = users.map(function(u) {
    return '<div class="user-row">' +
      '<div>' +
        '<div style="font-size:13px;font-weight:600">' + u.email + '</div>' +
        '<div style="font-size:11px;color:#888;margin-top:2px">UID: ' + u.uid + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
        '<select onchange="changeUserRole(\'' + u.uid + '\',this.value)" style="padding:5px 8px;border-radius:6px;border:1px solid #333;background:#2a2a2a;color:#f0ece3;font-size:12px">' +
          '<option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>admin</option>' +
          '<option value="staff"' + (u.role === 'staff' ? ' selected' : '') + '>staff</option>' +
          '<option value="springer"' + (u.role === 'springer' ? ' selected' : '') + '>springer</option>' +
        '</select>' +
        '<button class="res-act-btn del" onclick="deleteUser(\'' + u.uid + '\',\'' + u.email + '\')">Eliminar</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function changeUserRole(uid, role) {
  fetch(WORKER_URL + '/users', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + window.authToken },
    body: JSON.stringify({ uid: uid, role: role })
  }).catch(function() {
    alert('Error al cambiar rol');
    loadUsers();
  });
}

function deleteUser(uid, email) {
  if (!confirm('¿Eliminar usuario ' + email + '?')) return;
  fetch(WORKER_URL + '/users', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + window.authToken },
    body: JSON.stringify({ uid: uid })
  })
  .then(loadUsers)
  .catch(function() { alert('Error al eliminar usuario'); });
}

function openAddUserModal() {
  ge('addUserModalOverlay').classList.add('open');
  ge('newUserEmail').value = '';
  ge('newUserPass').value = '';
  ge('newUserRole').value = 'staff';
  ge('addUserError').textContent = '';
}

function saveNewUser() {
  var email = ge('newUserEmail').value.trim();
  var pass = ge('newUserPass').value;
  var role = ge('newUserRole').value;
  if (!email || !pass) {
    ge('addUserError').textContent = 'Email y contraseña requeridos';
    return;
  }
  ge('addUserError').textContent = '';
  fetch(WORKER_URL + '/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + window.authToken },
    body: JSON.stringify({ email: email, password: pass, role: role })
  })
  .then(function(r) { return r.json(); })
  .then(function() {
    ge('addUserModalOverlay').classList.remove('open');
    loadUsers();
  })
  .catch(function() { ge('addUserError').textContent = 'Error al crear usuario'; });
}
