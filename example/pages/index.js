import React from 'react';
import Head from 'next/head';
import Nav from '../components/nav';
import {
  HomeTitle,
  HomeDescription,
  HomeLinksDocs,
  HomeLinksLearn,
  HomeLinksExamples,
  HomeLabel
} from '@locale';

function LinkTitle({ children }) {
  return (
    <h3>
      <style jsx>{`
        h3 {
          margin: 0;
          color: #067df7;
          font-size: 18px;
        }
      `}</style>
      {children} &rarr;
    </h3>
  );
}

function LinkSubTitle({ children }) {
  return (
    <p>
      <style jsx>{`
        p {
          margin: 0;
          padding: 12px 0 0;
          font-size: 13px;
          color: #333;
        }
      `}</style>
      {children}
    </p>
  );
}

const Home = () => (
  <div>
    <Head>
      <title>
        <HomeLabel />
      </title>
      <link rel="icon" href="/favicon.ico" />
    </Head>

    <Nav />

    <div className="hero">
      <h1 className="title">
        <HomeTitle />
      </h1>
      <p className="description">
        <HomeDescription Code="code" />
      </p>

      <div className="row">
        <a href="https://nextjs.org/docs" className="card">
          <HomeLinksDocs Title={LinkTitle} SubTitle={LinkSubTitle} />
        </a>
        <a href="https://nextjs.org/learn" className="card">
          <HomeLinksLearn Title={LinkTitle} SubTitle={LinkSubTitle} />
        </a>
        <a
          href="https://github.com/zeit/next.js/tree/master/examples"
          className="card"
        >
          <HomeLinksExamples Title={LinkTitle} SubTitle={LinkSubTitle} />
        </a>
      </div>
    </div>

    <style jsx>{`
      .hero {
        width: 100%;
        color: #333;
      }
      .title {
        margin: 0;
        width: 100%;
        padding-top: 80px;
        line-height: 1.15;
        font-size: 48px;
      }
      .title,
      .description {
        text-align: center;
      }
      .row {
        max-width: 880px;
        margin: 80px auto 40px;
        display: flex;
        flex-direction: row;
        justify-content: space-around;
      }
      .card {
        padding: 18px 18px 24px;
        width: 220px;
        text-align: left;
        text-decoration: none;
        color: #434343;
        border: 1px solid #9b9b9b;
      }
      .card:hover {
        border-color: #067df7;
      }
    `}</style>
  </div>
);

export default Home;
