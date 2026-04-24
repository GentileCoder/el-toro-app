function renderUsuarios() {
  var el = ge('tab-usuarios');
  el.innerHTML = '<div class="toolbar"><button class="btn-primary" onclick="openAddUserModal()">'+t('users.new')+'</button></div><div id="userList"><div style="color:#666;font-size:13px">'+t('users.loading')+'</div></div>';
  loadUsers();
}

function loadUsers() {
  fetch(WORKER_URL + '/users', {
    headers: { 'Authorization': 'Bearer ' + window.authToken }
  })
  .then(function(r) { return r.json(); })
  .then(function(users) { renderUserList(users); })
  .catch(function() {
    ge('userList').innerHTML = '<div style="color:#e87c7c;font-size:13px">'+t('users.error_load')+'</div>';
  });
}

function renderUserList(users) {
  var el = ge('userList');
  if (!users.length) {
    el.innerHTML = '<div style="color:#666;font-size:13px">'+t('users.empty')+'</div>';
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
          '<option value="manager"' + (u.role === 'manager' ? ' selected' : '') + '>manager</option>' +
        '</select>' +
        '<button class="res-act-btn del" onclick="deleteUser(\'' + u.uid + '\',\'' + u.email + '\')">'+t('users.delete')+'</button>' +
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
    alert(t('users.error_role'));
    loadUsers();
  });
}

function deleteUser(uid, email) {
  if (!confirm(t('users.confirm_delete').replace('{email}', email))) return;
  fetch(WORKER_URL + '/users', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + window.authToken },
    body: JSON.stringify({ uid: uid })
  })
  .then(loadUsers)
  .catch(function() { alert(t('users.error_delete')); });
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
    ge('addUserError').textContent = t('users.email_required');
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
  .catch(function() { ge('addUserError').textContent = t('users.error_create'); });
}
