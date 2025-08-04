# Configuration du Service Email

Ce guide vous explique comment configurer le service email pour les notifications administratives.

## ⚠️ Configuration Requise

Pour que les notifications email fonctionnent, vous devez configurer les variables d'environnement SMTP.

### 1. Créer un fichier .env

Copiez le fichier `.env.example` vers `.env` :

```bash
cp .env.example .env
```

### 2. Configurer les Variables Email

Éditez le fichier `.env` et ajoutez/modifiez ces variables :

```bash
# Configuration SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-app
SMTP_FROM=votre-email@gmail.com
```

## 📧 Configuration Gmail (Recommandée)

### Étapes pour Gmail :

1. **Activer la vérification en 2 étapes** sur votre compte Gmail
2. **Générer un mot de passe d'application** :
   - Allez dans votre compte Google → Sécurité
   - Cliquez sur "Mots de passe d'application"
   - Sélectionnez "Mail" et générez un mot de passe
   - Utilisez ce mot de passe dans `SMTP_PASS`

### Configuration Gmail :
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=admin@votredomaine.com
SMTP_PASS=abcd efgh ijkl mnop  # Mot de passe d'application
SMTP_FROM=admin@votredomaine.com
```

## 🔧 Autres Fournisseurs Email

### Outlook/Hotmail :
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

### Yahoo :
```bash
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
```

### SendGrid :
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=votre-api-key-sendgrid
```

## ✅ Test de Configuration

1. **Redémarrez le serveur** après avoir modifié les variables d'environnement
2. **Connectez-vous en tant que super-admin**
3. **Allez dans la section Ouvriers**
4. **Cliquez sur "Test Email"** dans la barre d'outils
5. **Entrez votre adresse email** et cliquez sur "Envoyer test"

## 🚨 Dépannage

### Erreur "Authentication failed" :
- Vérifiez que vous utilisez un mot de passe d'application (pas votre mot de passe principal)
- Assurez-vous que la vérification en 2 étapes est activée

### Erreur "Connection timeout" :
- Vérifiez les paramètres SMTP_HOST et SMTP_PORT
- Vérifiez votre connexion internet

### Email non reçu :
- Vérifiez le dossier spam/courrier indésirable
- Vérifiez que l'adresse email est correcte
- Testez avec une autre adresse email

## 📋 Configuration des Emails d'Administration

Pour que les notifications soient envoyées aux bons administrateurs :

1. **Modifiez la fonction `getAdminEmail`** dans `client/pages/Workers.tsx`
2. **Implémentez une résolution d'email appropriée** basée sur vos utilisateurs Firebase
3. **Ou configurez un mapping statique** des fermes vers les emails

### Exemple de mapping statique :
```javascript
const getAdminEmail = (farm: Ferme | null): string | null => {
  if (!farm) return null;
  
  const farmEmailMapping = {
    'ferme-1': 'admin.ferme1@exemple.com',
    'ferme-2': 'admin.ferme2@exemple.com',
    // Ajoutez vos fermes ici
  };
  
  return farmEmailMapping[farm.id] || 'admin@exemple.com';
};
```

## 🔐 Sécurité

- **Ne committez jamais** le fichier `.env` dans votre dépôt Git
- **Utilisez des mots de passe d'application** plutôt que vos mots de passe principaux
- **Restreignez l'accès** aux variables d'environnement en production
- **Utilisez un service email professionnel** en production (SendGrid, AWS SES, etc.)

## 📞 Support

Si vous avez des problèmes de configuration :

1. Vérifiez les logs du serveur pour les erreurs détaillées
2. Testez la connexion avec le bouton "Test Email"
3. Consultez la documentation de votre fournisseur email
4. Contactez votre administrateur système si nécessaire
