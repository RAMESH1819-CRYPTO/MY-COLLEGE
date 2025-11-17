// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAsxVInw8D_oqwKzdedMMV0i7R20t-pzGk",
  authDomain: "inst-79bbf.firebaseapp.com",
  projectId: "inst-79bbf",
  storageBucket: "inst-79bbf.firebasestorage.app",
  messagingSenderId: "1048627779460",
  appId: "1:1048627779460:web:6f95d729deb92724beefd1",
  measurementId: "G-9H8XMK4HL3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Global Variables
let currentUser = null;
let currentPage = 'home';

// DOM Elements
const loginPage = document.getElementById('loginPage');
const signupPage = document.getElementById('signupPage');
const appContainer = document.getElementById('appContainer');
const header = document.getElementById('header');
const loadingSpinner = document.getElementById('loadingSpinner');

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const logoutBtn = document.getElementById('logoutBtn');

const homeFeed = document.getElementById('homeFeed');
const uploadPage = document.getElementById('uploadPage');
const profilePage = document.getElementById('profilePage');

const postsContainer = document.getElementById('postsContainer');
const uploadForm = document.getElementById('uploadForm');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const fileLabel = document.getElementById('fileLabel');

// Auth State Observer
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        showApp();
        loadUserProfile();
        loadPosts();
    } else {
        currentUser = null;
        showLogin();
    }
});

// Show/Hide Pages
function showLogin() {
    loginPage.classList.remove('hidden');
    signupPage.classList.add('hidden');
    appContainer.classList.add('hidden');
    header.classList.add('hidden');
}

function showSignup() {
    loginPage.classList.add('hidden');
    signupPage.classList.remove('hidden');
    appContainer.classList.add('hidden');
    header.classList.add('hidden');
}

function showApp() {
    loginPage.classList.add('hidden');
    signupPage.classList.add('hidden');
    appContainer.classList.remove('hidden');
    header.classList.remove('hidden');
    showPage('home');
}

function showPage(page) {
    currentPage = page;
    
    homeFeed.classList.add('hidden');
    uploadPage.classList.add('hidden');
    profilePage.classList.add('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (page === 'home') {
        homeFeed.classList.remove('hidden');
        document.querySelector('[data-page="home"]').classList.add('active');
        loadPosts();
    } else if (page === 'upload') {
        uploadPage.classList.remove('hidden');
        document.querySelector('[data-page="upload"]').classList.add('active');
    } else if (page === 'profile') {
        profilePage.classList.remove('hidden');
        document.querySelector('[data-page="profile"]').classList.add('active');
        loadUserProfile();
        loadUserPosts();
    }
}

function showLoading() {
    loadingSpinner.classList.remove('hidden');
}

function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

// Auth Functions
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    showLoading();
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
    hideLoading();
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const username = document.getElementById('signupUsername').value;
    const fullName = document.getElementById('signupFullName').value;
    const password = document.getElementById('signupPassword').value;
    
    showLoading();
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        await db.collection('users').doc(user.uid).set({
            username: username,
            fullName: fullName,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
    } catch (error) {
        alert('Signup failed: ' + error.message);
    }
    hideLoading();
});

logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
    } catch (error) {
        alert('Logout failed: ' + error.message);
    }
});

document.getElementById('showSignup').addEventListener('click', (e) => {
    e.preventDefault();
    showSignup();
});

document.getElementById('showLogin').addEventListener('click', (e) => {
    e.preventDefault();
    showLogin();
});

// Navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const page = btn.getAttribute('data-page');
        showPage(page);
    });
});

// Upload Functions
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            imagePreview.src = event.target.result;
            imagePreview.classList.remove('hidden');
            fileLabel.textContent = file.name;
        };
        reader.readAsDataURL(file);
    }
});

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const file = imageInput.files[0];
    const caption = document.getElementById('captionInput').value;
    
    if (!file) {
        alert('Please select an image');
        return;
    }
    
    showLoading();
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        const timestamp = Date.now();
        const storageRef = storage.ref(`posts/${currentUser.uid}/${timestamp}_${file.name}`);
        
        const uploadTask = await storageRef.put(file);
        const downloadURL = await uploadTask.ref.getDownloadURL();
        
        await db.collection('posts').add({
            userId: currentUser.uid,
            username: userData.username,
            fullName: userData.fullName,
            imageUrl: downloadURL,
            caption: caption,
            likes: 0,
            likedBy: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        uploadForm.reset();
        imagePreview.classList.add('hidden');
        fileLabel.textContent = 'Choose a photo';
        
        alert('Post uploaded successfully!');
        showPage('home');
        
    } catch (error) {
        alert('Upload failed: ' + error.message);
    }
    
    hideLoading();
});

document.getElementById('cancelUpload').addEventListener('click', () => {
    uploadForm.reset();
    imagePreview.classList.add('hidden');
    fileLabel.textContent = 'Choose a photo';
    showPage('home');
});

// Load Posts
async function loadPosts() {
    postsContainer.innerHTML = '<div class="empty-state"><p>Loading posts...</p></div>';
    
    try {
        const snapshot = await db.collection('posts')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
        
        if (snapshot.empty) {
            postsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No posts yet</h3>
                    <p>Start sharing by creating your first post!</p>
                </div>
            `;
            return;
        }
        
        postsContainer.innerHTML = '';
        
        snapshot.forEach(doc => {
            const post = doc.data();
            const postElement = createPostElement(doc.id, post);
            postsContainer.appendChild(postElement);
        });
        
    } catch (error) {
        console.error('Error loading posts:', error);
        postsContainer.innerHTML = '<div class="empty-state"><p>Error loading posts</p></div>';
    }
}

// Create Post Element
function createPostElement(postId, post) {
    const postCard = document.createElement('div');
    postCard.className = 'post-card';
    
    const timestamp = post.createdAt ? post.createdAt.toDate() : new Date();
    const timeAgo = getTimeAgo(timestamp);
    
    const isLiked = post.likedBy && post.likedBy.includes(currentUser.uid);
    const likeIcon = isLiked 
        ? '<svg fill="#ed4956" viewBox="0 0 48 48"><path d="M34.6 3.1c-4.5 0-7.9 1.8-10.6 5.6-2.7-3.7-6.1-5.5-10.6-5.5C6 3.1 0 9.6 0 17.6c0 7.3 5.4 12 10.6 16.5.6.5 1.3 1.1 1.9 1.7l2.3 2c4.4 3.9 6.6 5.9 7.6 6.5.5.3 1.1.5 1.6.5s1.1-.2 1.6-.5c1-.6 2.8-2.2 7.8-6.8l2-1.8c.7-.6 1.3-1.2 2-1.7C42.7 29.6 48 25 48 17.6c0-8-6-14.5-13.4-14.5z"></path></svg>'
        : '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>';
    
    postCard.innerHTML = `
        <div class="post-header">
            <div class="post-avatar">${post.username ? post.username[0].toUpperCase() : 'U'}</div>
            <div class="post-user-info">
                <div class="post-username">${post.username || 'User'}</div>
                <div class="post-timestamp">${timeAgo}</div>
            </div>
        </div>
        <img src="${post.imageUrl}" alt="Post" class="post-image">
        <div class="post-actions">
            <button class="like-btn" data-post-id="${postId}">
                ${likeIcon}
            </button>
        </div>
        <div class="post-likes">${post.likes || 0} likes</div>
        ${post.caption ? `<div class="post-caption"><strong>${post.username}</strong> ${post.caption}</div>` : ''}
    `;
    
    const likeBtn = postCard.querySelector('.like-btn');
    likeBtn.addEventListener('click', () => toggleLike(postId, post));
    
    return postCard;
}

// Toggle Like
async function toggleLike(postId, post) {
    try {
        const postRef = db.collection('posts').doc(postId);
        const likedBy = post.likedBy || [];
        const isLiked = likedBy.includes(currentUser.uid);
        
        if (isLiked) {
            await postRef.update({
                likes: firebase.firestore.FieldValue.increment(-1),
                likedBy: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
            });
        } else {
            await postRef.update({
                likes: firebase.firestore.FieldValue.increment(1),
                likedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
            });
        }
        
        loadPosts();
        
    } catch (error) {
        console.error('Error toggling like:', error);
    }
}

// Load User Profile
async function loadUserProfile() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        document.getElementById('profileUsername').textContent = userData.username || 'User';
        document.getElementById('profileFullName').textContent = userData.fullName || '';
        
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Load User Posts
async function loadUserPosts() {
    const profilePosts = document.getElementById('profilePosts');
    profilePosts.innerHTML = '<div class="empty-state"><p>Loading posts...</p></div>';
    
    try {
        const snapshot = await db.collection('posts')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        const postCount = snapshot.size;
        document.getElementById('postCount').textContent = postCount;
        
        if (snapshot.empty) {
            profilePosts.innerHTML = `
                <div class="empty-state">
                    <h3>No posts yet</h3>
                    <p>Share your first photo!</p>
                </div>
            `;
            return;
        }
        
        profilePosts.innerHTML = '';
        
        snapshot.forEach(doc => {
            const post = doc.data();
            const postItem = document.createElement('div');
            postItem.className = 'profile-grid-item';
            postItem.innerHTML = `<img src="${post.imageUrl}" alt="Post">`;
            profilePosts.appendChild(postItem);
        });
        
    } catch (error) {
        console.error('Error loading user posts:', error);
        profilePosts.innerHTML = '<div class="empty-state"><p>Error loading posts</p></div>';
    }
}

// Utility Functions
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    
    return 'Just now';
}