# PayslipLens

*[English version](README.md)*

**Comprenez votre bulletin de paie. En toute confidentialité.**

PayslipLens lit un bulletin de paie ivoirien avec **Gemini Nano, l'IA intégrée à Chrome**, vérifie les retenues légales (CNPS, ITS, CMU) par un calcul exact et explique chaque ligne. Le bulletin ne quitte jamais l'appareil. Seul un résumé anonymisé part vers le cloud, et seulement si l'utilisateur pose une question et valide le texte exact envoyé.

Réalisé pour **#BuildHybridAI 2026** avec l'**inférence hybride de Firebase AI Logic** (Web / Chrome).

- Démo en ligne : https://payslip-lens.web.app
- Bulletins d'exemple (fictifs) : [correct](public/samples/payslip-ok.pdf), [avec erreurs](public/samples/payslip-errors.pdf)

## Le problème

La plupart des salariés en Côte d'Ivoire ne savent pas lire leur bulletin de paie. Depuis la réforme fiscale de janvier 2024, l'ITS suit un nouveau barème progressif avec une réduction pour charges de famille, et la cotisation retraite CNPS est plafonnée. Les erreurs sur ces retenues passent souvent inaperçues : mauvaise base, réduction familiale oubliée, indemnité de transport taxée à tort ou pas taxée.

La solution évidente, « envoyez votre bulletin à une IA », demande d'envoyer son salaire, son employeur et sa situation familiale à un serveur. Ce sont précisément les données à garder privées.

## La solution : hybride par conception

PayslipLens répartit le travail selon la **sensibilité** des données :

| Étape | Où elle tourne | Mode Firebase AI Logic | Pourquoi |
|---|---|---|---|
| Lire le PDF ou la photo | Navigateur (pdf.js) | aucun | Nano accepte du texte ou des images, pas de PDF. Chaque cellule du tableau est rattachée à sa colonne (`Retenue`, `Part patronale`). |
| Extraire les montants en JSON | **Gemini Nano** | `ONLY_ON_DEVICE` + schéma JSON en `responseConstraint` | Le salaire ne quitte jamais l'appareil. Les noms et identifiants ne sont jamais extraits. |
| Vérifier CNPS, ITS, CMU | Moteur de règles en TypeScript | aucun | Un calcul légal doit être exact, pas généré. |
| Expliquer une ligne du bulletin | **Gemini Nano**, en streaming | `ONLY_ON_DEVICE` | La ligne contient de vrais montants. |
| Répondre à une question | **Gemini dans le cloud** | `PREFER_IN_CLOUD` | Une réponse juridique demande un modèle plus grand. Il ne reçoit qu'un résumé anonymisé (tranche de salaire, pourcentages, résultats des contrôles, question masquée), montré à l'utilisateur avant l'envoi. |
| Pas de Nano dans ce navigateur | Gemini dans le cloud | `ONLY_IN_CLOUD` | Uniquement après une case de consentement explicite, avec la mention « Cloud · with your consent ». |

Chaque résultat indique où il a été calculé, grâce à `response.inferenceSource` : **On this device** ou **Cloud**.

## Où Firebase AI Logic est utilisé dans le code

- [`src/firebase.ts`](src/firebase.ts) : `initializeApp`, App Check (`ReCaptchaEnterpriseProvider`, fournisseur debug en développement), `getAI` avec `GoogleAIBackend`.
- [`src/payslip.ts`](src/payslip.ts) : modèle d'extraction local (`InferenceMode.ONLY_ON_DEVICE`, `onDeviceParams.promptOptions.responseConstraint`), `initializeDeviceModel()` lors d'un clic, et repli cloud soumis au consentement (`ONLY_IN_CLOUD`, `responseJsonSchema`).
- [`src/assistant.ts`](src/assistant.ts) : explications locales des lignes (`generateContentStream`) et questions au cloud (`PREFER_IN_CLOUD`), avec `inferenceSource`.
- [`src/config.ts`](src/config.ts) : **Remote Config**, avec `cloud_model` et `ci_rules`. Les taux légaux (par exemple un nouveau barème ITS) peuvent changer sans nouvelle version.
- [`src/anonymize.ts`](src/anonymize.ts) : ce qui a le droit de quitter l'appareil.
- [`src/rules.ts`](src/rules.ts) : règles de paie ivoiriennes, réforme 2024.

Produits Firebase utilisés : **AI Logic** (inférence hybride), **App Check** (reCAPTCHA Enterprise / Fraud Defense), **Remote Config**, **Hosting**.

## Règles de paie vérifiées

| Contrôle | Règle (mensuelle) |
|---|---|
| CNPS retraite, part salariale | 6,3 % du brut imposable, plafond 3 375 000 FCFA |
| ITS | 0 % jusqu'à 75 000 ; 16 % jusqu'à 240 000 ; 21 % jusqu'à 800 000 ; 24 % jusqu'à 2 400 000 ; 28 % jusqu'à 8 000 000 ; 32 % au-delà ; moins la réduction pour charges de famille (RICF) : 5 500 FCFA par demi-part supplémentaire, de 1,5 à 5 parts |
| CMU | 500 FCFA par personne couverte |
| Indemnité de transport | Exonérée jusqu'à 30 000 FCFA |
| Net à payer | Le brut moins les retenues doit correspondre au net affiché |
| Salaire minimum | Un brut imposable inférieur à 75 000 FCFA est signalé |

L'utilisateur peut modifier le nombre de parts (situation familiale) pour revérifier l'ITS. Les taux sont des valeurs par défaut dans le code, modifiables par Remote Config, et couverts par des tests unitaires.

## Tester l'application (juges)

### Option A : entièrement privée, sur l'appareil (recommandée)

1. Utilisez **Chrome 139 ou plus récent sur ordinateur** (Windows, macOS, Linux), avec au moins 22 Go d'espace disque libre.
2. Ouvrez `chrome://flags`, activez ces trois options, puis relancez Chrome :
   - `#optimization-guide-on-device-model` : **Enabled BypassPerfRequirement**
   - `#prompt-api-for-gemini-nano` : **Enabled**
   - `#prompt-api-for-gemini-nano-multimodal-input` : **Enabled**
3. Vérifiez dans DevTools : `typeof LanguageModel` doit renvoyer `"function"`.
4. Ouvrez https://payslip-lens.web.app. La barre du haut affiche l'état de l'IA locale. Cliquez sur **Turn on** ou **Download (one time)**. Le premier téléchargement de Gemini Nano peut prendre plusieurs minutes.
5. Cliquez sur **Try a sample with errors**. L'extraction prend environ une minute sur le processeur d'un ordinateur portable (mesuré : 59 s). Le résultat affiche **On this device**, deux avertissements (base CNPS, réduction familiale absente sur l'ITS) et une information (transport taxable).
6. Cliquez sur **Explain** sur une ligne (en local), puis posez une question : relisez le texte anonymisé et envoyez-le au cloud.

### Option B : n'importe quel navigateur

Sans Gemini Nano, cochez la case de consentement (« Analyze in the cloud instead ») et essayez un exemple. Les montants sont alors extraits par Gemini dans le cloud, et le résultat porte la mention **Cloud · with your consent**.

Aucun compte ni identifiant n'est nécessaire. Rien n'est stocké.

## Lancer en local

```bash
npm install
cp .env.example .env.local   # puis renseignez la config de votre app web Firebase
npm run dev                  # http://localhost:5173
npm test                     # tests des règles, de l'anonymiseur et des réessais
npm run build
```

En développement local, App Check utilise le fournisseur debug : la console du navigateur affiche un jeton debug à enregistrer dans la console Firebase > App Check > Applications > Gérer les jetons de débogage. Ne le commitez jamais.

## Réalisé pendant la période du concours

Ce projet a été créé de zéro pendant #BuildHybridAI 2026 (démarré le 25 novembre 2026). Les taux de paie ont été recoupés avec un module de paie Odoo pour la Côte d'Ivoire que l'auteur maintient. Aucun code n'en a été repris. Code tiers : [Firebase JS SDK](https://github.com/firebase/firebase-js-sdk) et [pdf.js](https://github.com/mozilla/pdf.js) (Apache-2.0), [Vite](https://vite.dev) (MIT). Les formes des icônes suivent [Lucide](https://lucide.dev) (ISC).

## Avertissement

PayslipLens fournit de l'information, pas un conseil juridique ou fiscal. Si un contrôle échoue, adressez-vous à votre service RH, à la CNPS ou aux impôts (DGI).

## Licence

[Apache License 2.0](LICENSE)
