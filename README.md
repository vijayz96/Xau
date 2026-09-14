# CodeVault — Firebase Edition

A responsive exam-program library for Python, SQL, Tableau and EDC.

## Folder structure

```text
codevault/
├── index.html
├── admin.html
├── firestore.rules
├── README.md
├── css/
│   └── style.css
└── js/
    ├── firebase-config.js
    ├── firebase.js
    ├── index.js
    └── admin.js
```

## 1. Create Firebase project

1. Open Firebase Console.
2. Create a project.
3. Add a Web App.
4. Copy the Firebase configuration into `js/firebase-config.js`.
5. Create a Firestore Database.
6. Enable Authentication → Sign-in method → Email/Password.

## 2. Create your admin login

In Firebase Console → Authentication → Users:

- Add a user with your admin email and password.
- Copy that user's UID.

Then open Firestore and create:

```text
admins
  └── YOUR_ADMIN_UID
       ├── email: "your-admin-email@example.com"
       └── role: "admin"
```

Do not allow normal users to create documents in `admins`.

## 3. Firestore rules

Copy `firestore.rules` into Firebase Console → Firestore Database → Rules and click Publish.

These rules make programs publicly readable, while only a user whose UID exists in `admins` can add, edit or delete programs.

## 4. Add the website to GitHub

Upload the whole project while keeping the folder structure.

Then GitHub → Settings → Pages:

- Source: Deploy from a branch
- Branch: `main`
- Folder: `/ (root)`

Your user page will be `index.html` and your admin page will be `admin.html`.

## Security note

The Firebase Web App config is intended to be used in browser code. Do NOT put Firebase service-account JSON, private keys, or Admin SDK credentials in this GitHub project.

The real protection is Firebase Authentication + Firestore Security Rules.

## Program document format

Collection: `programs`

Example:

```text
subject: "Python"
title: "Factorial Program"
description: "Find factorial of a number."
difficulty: "Easy"
code: "your code here"
createdAt: server timestamp
updatedAt: server timestamp
```
