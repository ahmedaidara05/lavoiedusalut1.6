// Firebase et Gemini
const GEMINI_API_KEY = 'AIzaSyA0vL0QgFDkAi-ScZDVKC1G5MgcFCURE1A';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
const bookContent = {
    fr: {
        1: "Clara se tenait au sommet de la colline... (Chapitre 1)",
        2: "Dans les archives poussiéreuses... (Chapitre 2)",
        3: "Armée de son courage... (Chapitre 3)",
        4: "Le voile se leva... (Chapitre 4)",
        5: "Avec la vérité rétablie... (Chapitre 5)"
    },
    en: { /* Traductions anglaises */ },
    ar: { /* Traductions arabes */ }
};

// Protection
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
    if (e.ctrlKey && (e.key === 'p' || e.key === 'c')) e.preventDefault();
});

// Authentification
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = 'login.html'; // À créer si besoin
    }
});

// Préférences
const defaultPrefs = {
    language: 'fr',
    theme: 'light',
    textSize: 16,
    voice: 'female'
};
let userPrefs = { ...defaultPrefs };
function savePrefs() {
    if (auth.currentUser) {
        db.collection('users').doc(auth.currentUser.uid).set(userPrefs, { merge: true });
    }
    localStorage.setItem('prefs', JSON.stringify(userPrefs));
}
function loadPrefs() {
    if (auth.currentUser) {
        db.collection('users').doc(auth.currentUser.uid).get().then(doc => {
            if (doc.exists) {
                userPrefs = { ...defaultPrefs, ...doc.data() };
                applyPrefs();
            }
        });
    }
    const savedPrefs = localStorage.getItem('prefs');
    if (savedPrefs) {
        userPrefs = { ...defaultPrefs, ...JSON.parse(savedPrefs) };
        applyPrefs();
    }
}
function applyPrefs() {
    document.documentElement.style.fontSize = `${userPrefs.textSize}px`;
    document.body.classList.toggle('dark-mode', userPrefs.theme === 'dark');
    document.querySelector('#languageSelect')?.value = userPrefs.language;
    document.querySelector('#themeSelect')?.value = userPrefs.theme;
    document.querySelector('#textSize')?.value = userPrefs.textSize;
    document.querySelector('#voiceSelect')?.value = userPrefs.voice;
}

// Accueil
if (document.getElementById('startButton')) {
    document.getElementById('startButton').addEventListener('click', () => {
        window.location.href = 'sommaire.html';
    });
    const animatedElements = document.querySelectorAll('.title, .details-row, .section-label, .description');
    animatedElements.forEach(el => {
        const startY = getComputedStyle(el).transform === 'matrix(1, 0, 0, 1, 0, 0)' ?
            el.style.transform.replace('translateY(', '').replace('px)', '') : 0;
        el.style.setProperty('--start-y', startY + 'px');
    });
}

// Sommaire/Favoris
if (document.querySelector('.chapter-container')) {
    const chapterCards = document.querySelectorAll('.chapter-card');
    chapterCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `all 1s ease ${index * 0.1}s`;
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100);
        card.addEventListener('click', () => {
            const chapter = card.dataset.chapter;
            window.location.href = `lecture.html#chapter${chapter}`;
        });
    });
}

// Favoris
if (document.getElementById('favoritesList')) {
    function loadFavorites() {
        const favoritesList = document.getElementById('favoritesList');
        favoritesList.innerHTML = '';
        if (auth.currentUser) {
            db.collection('users').doc(auth.currentUser.uid).collection('favorites').get().then(snapshot => {
                snapshot.forEach(doc => {
                    const chapter = doc.data();
                    const card = document.createElement('div');
                    card.classList.add('chapter-card');
                    card.dataset.chapter = chapter.id;
                    card.innerHTML = `
                        <h2>Chapitre ${chapter.id}: ${chapter.title}</h2>
                        <div class="progress-bar"><div class="progress-bar-fill" style="width: ${chapter.progress}%"></div></div>
                    `;
                    favoritesList.appendChild(card);
                    card.addEventListener('click', () => {
                        window.location.href = `lecture.html#chapter${chapter.id}`;
                    });
                });
            });
        }
    }
    loadFavorites();
}

// Lecture
if (document.querySelector('.book-content')) {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.querySelector('.theme-icon');
    const zoomControls = document.getElementById('zoom-controls');
    const bookContent = document.querySelector('.book-content');
    const audioReader = document.getElementById('audio-reader');
    const bookmarkBtn = document.getElementById('bookmark-btn');
    const languageSwitcher = document.getElementById('language-switcher');
    let fontSize = userPrefs.textSize;
    let isReading = false;

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        themeIcon.classList.toggle('rotate-left');
        themeIcon.textContent = document.body.classList.contains('dark-mode') ? 'brightness_7' : 'brightness_4';
        userPrefs.theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        savePrefs();
    });

    zoomControls.addEventListener('click', () => {
        fontSize = fontSize >= 22 ? 16 : fontSize + 2;
        bookContent.style.fontSize = fontSize + 'px';
        zoomControls.querySelector('i').textContent = fontSize >= 22 ? 'zoom_out' : 'zoom_in';
        userPrefs.textSize = fontSize;
        savePrefs();
    });

    audioReader.addEventListener('click', () => {
        isReading = !isReading;
        if (isReading) {
            const text = bookContent.textContent;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = userPrefs.language;
            utterance.voice = speechSynthesis.getVoices().find(v => v.name.includes(userPrefs.voice)) || null;
            speechSynthesis.speak(utterance);
            audioReader.querySelector('i').textContent = 'stop';
        } else {
            speechSynthesis.cancel();
            audioReader.querySelector('i').textContent = 'headphones';
        }
    });

    bookmarkBtn.addEventListener('click', () => {
        const icon = bookmarkBtn.querySelector('i');
        const chapterId = location.hash.replace('#chapter', '');
        if (icon.textContent === 'favorite_border' && auth.currentUser) {
            db.collection('users').doc(auth.currentUser.uid).collection('favorites').doc(chapterId).set({
                id: chapterId,
                title: document.querySelector(`#chapter${chapterId} h1`).textContent,
                progress: 100 // Simulé
            });
            icon.textContent = 'favorite';
            icon.style.color = '#e74c3c';
        } else {
            db.collection('users').doc(auth.currentUser.uid).collection('favorites').doc(chapterId).delete();
            icon.textContent = 'favorite_border';
            icon.style.color = '';
        }
    });

    languageSwitcher.addEventListener('click', () => {
        const langs = ['fr', 'en', 'ar'];
        userPrefs.language = langs[(langs.indexOf(userPrefs.language) + 1) % langs.length];
        savePrefs();
        location.reload();
    });

    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = 'sommaire.html';
    });

    // Progression
    bookContent.addEventListener('scroll', () => {
        const chapterId = location.hash.replace('#chapter', '');
        const chapter = document.getElementById(`chapter${chapterId}`);
        if (chapter && auth.currentUser) {
            const progress = Math.min(100, (bookContent.scrollTop / (chapter.scrollHeight - bookContent.clientHeight)) * 100);
            db.collection('users').doc(auth.currentUser.uid).collection('favorites').doc(chapterId).set({
                progress: progress
            }, { merge: true });
        }
    });
}

// Paramètres
if (document.querySelector('.sidebar')) {
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const userPhone = document.getElementById('userPhone');
    const resetPassword = document.getElementById('resetPassword');
    const languageSelect = document.getElementById('languageSelect');
    const textSize = document.getElementById('textSize');
    const themeSelect = document.getElementById('themeSelect');
    const voiceSelect = document.getElementById('voiceSelect');
    const avatarUpload = document.getElementById('avatarUpload');
    const userAvatar = document.getElementById('userAvatar');

    userName.addEventListener('change', () => {
        if (auth.currentUser) {
            db.collection('users').doc(auth.currentUser.uid).set({ name: userName.value }, { merge: true });
        }
    });
    userEmail.addEventListener('change', () => {
        if (auth.currentUser) {
            auth.currentUser.updateEmail(userEmail.value).catch(err => alert('Erreur email: ' + err.message));
        }
    });
    userPhone.addEventListener('change', () => {
        if (auth.currentUser) {
            db.collection('users').doc(auth.currentUser.uid).set({ phone: userPhone.value }, { merge: true });
        }
    });
    resetPassword.addEventListener('click', e => {
        e.preventDefault();
        if (auth.currentUser) {
            auth.sendPasswordResetEmail(auth.currentUser.email).then(() => alert('Email de réinitialisation envoyé'));
        }
    });
    languageSelect.addEventListener('change', () => {
        userPrefs.language = languageSelect.value;
        savePrefs();
        location.reload();
    });
    textSize.addEventListener('input', () => {
        userPrefs.textSize = parseInt(textSize.value);
        savePrefs();
        applyPrefs();
    });
    themeSelect.addEventListener('change', () => {
        userPrefs.theme = themeSelect.value === 'auto' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : themeSelect.value;
        savePrefs();
        applyPrefs();
    });
    voiceSelect.addEventListener('change', () => {
        userPrefs.voice = voiceSelect.value;
        savePrefs();
    });
    userAvatar.addEventListener('click', () => avatarUpload.click());
    avatarUpload.addEventListener('change', () => {
        if (avatarUpload.files[0] && auth.currentUser) {
            const ref = storage.ref(`avatars/${auth.currentUser.uid}`);
            ref.put(avatarUpload.files[0]).then(() => {
                ref.getDownloadURL().then(url => {
                    userAvatar.src = url;
                    db.collection('users').doc(auth.currentUser.uid).set({ avatar: url }, { merge: true });
                });
            });
        }
    });
    document.getElementById('backBtn').addEventListener('click', () => {
        const referrer = document.referrer;
        window.location.href = referrer.includes(location.hostname) ? referrer : 'index.html';
    });
}

// Assistant IA
if (document.getElementById('aiAssistantBtn')) {
    const aiAssistantBtn = document.getElementById('aiAssistantBtn');
    const aiChatContainer = document.getElementById('aiChatContainer');
    const aiCloseBtn = document.getElementById('aiCloseBtn');
    const aiChatMessages = document.getElementById('aiChatMessages');
    const aiUserInput = document.getElementById('aiUserInput');
    const aiSendBtn = document.getElementById('aiSendBtn');
    const aiTypingIndicator = document.getElementById('aiTypingIndicator');
    const aiClearHistoryBtn = document.getElementById('aiClearHistoryBtn');

    aiAssistantBtn.addEventListener('click', () => {
        aiChatContainer.classList.toggle('active');
        if (aiChatContainer.classList.contains('active')) {
            aiUserInput.focus();
            loadChatHistory();
        }
    });
    aiCloseBtn.addEventListener('click', () => {
        aiChatContainer.classList.remove('active');
    });
    function addMessage(text, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        messageElement.textContent = text;
        aiChatMessages.appendChild(messageElement);
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
        if (auth.currentUser) {
            db.collection('users').doc(auth.currentUser.uid).collection('chatHistory').add({
                text: text,
                sender: sender,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }
    function loadChatHistory() {
        aiChatMessages.innerHTML = '';
        if (auth.currentUser) {
            db.collection('users').doc(auth.currentUser.uid).collection('chatHistory')
                .orderBy('timestamp').get().then(snapshot => {
                    snapshot.forEach(doc => {
                        const msg = doc.data();
                        addMessage(msg.text, msg.sender);
                    });
                });
        }
    }
    aiClearHistoryBtn.addEventListener('click', () => {
        if (auth.currentUser) {
            db.collection('users').doc(auth.currentUser.uid).collection('chatHistory').get().then(snapshot => {
                snapshot.forEach(doc => doc.ref.delete());
                aiChatMessages.innerHTML = '';
            });
        }
    });
    async function sendMessage() {
        const message = aiUserInput.value.trim();
        if (!message) return;
        addMessage(message, 'user');
        aiUserInput.value = '';
        aiTypingIndicator.classList.add('active');
        aiUserInput.disabled = true;
        aiSendBtn.disabled = true;
        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `Répondez en ${userPrefs.language} à une question sur le livre L’Aube Nouvelle: ${message}` }]
                    }]
                })
            });
            const data = await response.json();
            const reply = data.candidates[0].content.parts[0].text;
            addMessage(reply, 'ai');
        } catch (err) {
            addMessage('Erreur: Impossible de contacter l’IA', 'ai');
        }
        aiTypingIndicator.classList.remove('active');
        aiUserInput.disabled = false;
        aiSendBtn.disabled = false;
        aiUserInput.focus();
    }
    aiSendBtn.addEventListener('click', sendMessage);
    aiUserInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') sendMessage();
    });
    window.addEventListener('load', () => {
        setTimeout(() => {
            addMessage(`Bonjour ! Je suis votre Assistant Premium. Posez-moi des questions sur L’Aube Nouvelle en ${userPrefs.language}.`, 'ai');
        }, 1000);
    });
    setInterval(() => {
        const halo = document.createElement('div');
        halo.classList.add('halo-effect');
        halo.style.position = 'absolute';
        halo.style.width = '100%';
        halo.style.height = '100%';
        halo.style.background = 'radial-gradient(circle, rgba(255,215,0,0.4) 0%, rgba(255,215,0,0) 70%)';
        halo.style.borderRadius = '50%';
        halo.style.top = '0';
        halo.style.left = '0';
        halo.style.opacity = '0';
        halo.style.animation = 'haloPulse 3s infinite';
        aiAssistantBtn.appendChild(halo);
        setTimeout(() => halo.remove(), 3000);
    }, 4000);
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    loadPrefs();
    // Navigation barre inférieure
    document.querySelectorAll('.bottom-bar .icon').forEach(icon => {
        icon.addEventListener('click', () => {
            const nav = icon.dataset.nav;
            const urls = {
                home: 'index.html',
                sommaire: 'sommaire.html',
                lecture: 'lecture.html',
                favoris: 'favoris.html',
                profil: 'parametres.html'
            };
            window.location.href = urls[nav];
        });
    });
});
