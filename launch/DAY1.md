# Jour 1 — encaisser 5 000 € avec le Diagnostic Maestro 48 h

Le seul produit qui peut se vendre et s'encaisser le jour même est un produit
**à prix fixe, prépayé, à périmètre étroit, vendu à un contact chaud**. Pas une
audience à construire, pas un funnel : un virement.

Ce que ce dépôt vous donne :

| Pièce | Fichier | Rôle |
|---|---|---|
| Page de vente | `diagnostic.html` | Le lien à envoyer. Prix, délai, garantie, formulaire. |
| Bon de commande | `commande.html?client=…&contact=…&ref=…&symptom=…` | Une page, imprimable en PDF, avec IBAN et conditions. C'est l'objet qui déclenche le virement. |
| E-mails | `launch/emails.md` | 4 séquences FR + EN par type de contact. |
| Post LinkedIn | `launch/linkedin.md` | 1 post d'annonce + 3 relances. |
| Mail-merge | `launch/prospects.csv` + `node launch/mailmerge.js` | Génère un e-mail personnalisé par prospect avec lien `mailto:` prêt à cliquer. |

Réalité : rien ne garantit 5 000 € le jour 1. Ce qui l'a rendu possible pour
d'autres consultants : **une offre qu'un décideur peut accepter sans comité**,
envoyée à **20 à 40 personnes qui connaissent déjà votre travail**, avec un
document de commande qu'ils peuvent signer dans l'heure.

## Avant 9 h — 45 minutes de préparation

1. **Compléter les champs rouges** dans `commande.html` et `mentions-legales.html` :
   dénomination, SIREN, TVA, adresse, IBAN, BIC. Sans IBAN, pas de virement.
2. **Créer un lien de paiement carte** (Stripe Payment Link, 6 000 € TTC, ou
   5 000 € HT avec TVA automatique). Coller l'URL dans `assets/site.js`
   (`PAY_URL`). Facultatif : le virement suffit pour le jour 1.
3. **Renseigner** `launch/prospects.csv` : 30 lignes minimum, triées par chaleur.
   Ex-collègues intégrateur, chefs de projet Maestro chez d'anciens clients,
   responsables planning rencontrés en go-live, contacts partenaires Kinaxis.
4. Lancer `node launch/mailmerge.js` : un fichier `.txt` par prospect dans
   `launch/out/`, chacun avec son lien `mailto:` en tête.
5. Pousser la branche, vérifier que `diagnostic.html` répond en ligne.

## 9 h – 11 h — les 10 contacts les plus chauds, par message direct

Pas d'e-mail : **WhatsApp, LinkedIn DM, téléphone**. Séquence `A` de
`emails.md` (version courte). Objectif : obtenir « on a justement un truc qui
traîne » de 2 à 3 personnes.

Dès qu'une personne décrit un symptôme : ouvrir
`commande.html?client=…&contact=…&ref=APS-2026-001&symptom=…`, imprimer en PDF,
envoyer dans les 10 minutes avec le message `D` (bon de commande). Le délai de
48 h démarre à réception des fonds, ce qui rend la décision facile pour eux.

## 11 h – 12 h — le post LinkedIn

Publier `linkedin.md` (post 1). Taguer personne. Commenter soi-même avec le lien
`diagnostic.html`. Envoyer ensuite le lien du post en DM aux 10 contacts du
matin : « si tu connais quelqu'un qui a ce problème cette semaine… ».

## 14 h – 17 h — les 20 à 30 contacts suivants, par e-mail

Séquences `B` (anciens clients / chefs de projet) et `C` (partenaires,
intégrateurs, freelances Kinaxis qui peuvent sous-traiter). Un e-mail par
personne, envoyé à la main depuis les fichiers de `launch/out/`. Pas d'outil
d'envoi en masse le jour 1 : c'est du réseau, pas de la prospection froide.

## 17 h – 18 h — relances et clôture

- Relancer par DM toute personne ayant répondu sans commander : proposer un
  appel de 15 minutes **le soir même**.
- Pour tout « pas maintenant » : demander « qui, dans ton réseau, a un ticket
  Kinaxis ouvert depuis plus d'une semaine ? ». Une intro vaut un prospect chaud.
- Pour tout « on n'a pas 5 000 € sans PO » : envoyer le bon de commande quand
  même. Le PO se fait en parallèle ; le virement peut partir sur bon signé.

## Le lendemain

Le formulaire de `diagnostic.html` écrit dans Postgres (Vercel) ou ouvre un
`mailto:` (GitHub Pages). Chaque lead avec l'intent `diagnostic` reçoit :

1. la fiche d'intake (symptôme, accès, extraits) ;
2. le bon de commande pré-rempli ;
3. une proposition de créneau de restitution.

Post 2 de `linkedin.md` le jour 3, post 3 le jour 7.

## Ce qui fait échouer le jour 1

- Envoyer la page sans bon de commande. Le PDF avec IBAN est ce qui se signe.
- Élargir le périmètre en appel. Un symptôme. Le reste, c'est la Design Review.
- Négocier le prix. Le forfait et le remboursement en cas de retard sont
  l'offre ; sans eux, c'est de la régie déguisée.
- Attendre des réponses aux e-mails. Le matin se fait au téléphone.
