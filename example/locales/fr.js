import * as React from "react";

const HomeTitle = function HomeTitle() {
  return "Bienvenue chez Next.js!";
};

const HomeDescription = function HomeDescription({
  Code
}) {
  return React.createElement(React.Fragment, null, "Pour commencer, modifiez ", React.createElement(Code, null, "pages/index.js"), " et enregistrez pour recharger.");
};

const HomeLinksDocs = function HomeLinksDocs({
  Title,
  SubTitle
}) {
  return React.createElement(React.Fragment, null, React.createElement(Title, null, "Documentation"), React.createElement(SubTitle, null, "En savoir plus sur Next.js dans la documentation."));
};

const HomeLinksLearn = function HomeLinksLearn({
  Title,
  SubTitle
}) {
  return React.createElement(React.Fragment, null, React.createElement(Title, null, "Apprends Next.js"), React.createElement(SubTitle, null, "D\xE9couvrez Next.js en suivant un tutoriel interactif!"));
};

const HomeLinksExamples = function HomeLinksExamples({
  Title,
  SubTitle
}) {
  return React.createElement(React.Fragment, null, React.createElement(Title, null, "Exemples"), React.createElement(SubTitle, null, "Trouvez d'autres exemples de passe-partout sur le Next.js GitHub."));
};

const HomeLabel = function HomeLabel() {
  return "Home";
};

const LocaleEn = function LocaleEn() {
  return "English";
};

const LocaleNl = function LocaleNl() {
  return "Nederlands";
};

const LocaleFr = function LocaleFr() {
  return "Fran\xE7ais";
};

export { HomeTitle, HomeDescription, HomeLinksDocs, HomeLinksLearn, HomeLinksExamples, HomeLabel, LocaleEn, LocaleNl, LocaleFr };