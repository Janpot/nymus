import * as React from "react";

const HomeTitle = function HomeTitle() {
  return "Welkom bij Next.js!";
};

const HomeDescription = function HomeDescription({
  Code
}) {
  return React.createElement(React.Fragment, null, "Om te beginnen, pas ", React.createElement(Code, null, "pages/index.js"), " aan en sla op om the herladen.");
};

const HomeLinksDocs = function HomeLinksDocs({
  Title,
  SubTitle
}) {
  return React.createElement(React.Fragment, null, React.createElement(Title, null, "Documentatie"), React.createElement(SubTitle, null, "Kom meer te weten over Next.js in de documentatie."));
};

const HomeLinksLearn = function HomeLinksLearn({
  Title,
  SubTitle
}) {
  return React.createElement(React.Fragment, null, React.createElement(Title, null, "Next.js Leren"), React.createElement(SubTitle, null, "Leer meer over Next.js Met de interactieve tutorial!"));
};

const HomeLinksExamples = function HomeLinksExamples({
  Title,
  SubTitle
}) {
  return React.createElement(React.Fragment, null, React.createElement(Title, null, "Voorbeelden"), React.createElement(SubTitle, null, "Vind boilerplate voorbeelden in Next.js GitHub repository."));
};

const HomeLabel = function HomeLabel() {
  return "Start";
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