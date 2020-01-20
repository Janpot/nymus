import * as React from "react";

const HomeTitle = function HomeTitle() {
  return "Welcome to Next.js!";
};

const HomeDescription = function HomeDescription({
  Code
}) {
  return React.createElement(React.Fragment, null, "To get started, edit ", React.createElement(Code, null, "pages/index.js"), " and save to reload.");
};

const HomeLinksDocs = function HomeLinksDocs({
  Title,
  SubTitle
}) {
  return React.createElement(React.Fragment, null, React.createElement(Title, null, "Documentation"), React.createElement(SubTitle, null, "Learn more about Next.js in the documentation."));
};

const HomeLinksLearn = function HomeLinksLearn({
  Title,
  SubTitle
}) {
  return React.createElement(React.Fragment, null, React.createElement(Title, null, "Next.js Learn"), React.createElement(SubTitle, null, "Learn about Next.js by following an interactive tutorial!"));
};

const HomeLinksExamples = function HomeLinksExamples({
  Title,
  SubTitle
}) {
  return React.createElement(React.Fragment, null, React.createElement(Title, null, "Examples"), React.createElement(SubTitle, null, "Find other example boilerplates on the Next.js GitHub."));
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