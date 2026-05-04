import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { PageShell } from '../../shared/components/layout/PageShell';
import { colors } from '../../shared/styles/tokens/colors';
import { homeCtas, homeHeroContent, quickRuleSections } from './homeContent';
import styles from './HomePage.module.css';

export function HomePage() {
  const assetBasePath = import.meta.env.BASE_URL;
  const heroPanelStyle = {
    backgroundColor: colors.brand.primaryPressed,
  } satisfies CSSProperties;

  return (
    <PageShell>
      <div className={styles.page}>
        <section className={styles.hero} aria-labelledby="home-hero-title">
          <div className={styles.heroContainer}>
            <div className={styles.heroPanel} style={heroPanelStyle}>
              <div className={styles.heroMedia} aria-hidden="true">
                <div className={styles.heroIllustrationWrap}>
                  <img
                    src={`${assetBasePath}assets/images/home/chicken.png`}
                    alt=""
                    className={styles.heroIllustration}
                  />
                </div>
              </div>
              <div className={styles.heroBody}>
                <p className={styles.heroEyebrow}>{homeHeroContent.eyebrow}</p>
                <h1 id="home-hero-title" className={styles.heroTitle}>
                  {homeHeroContent.title}
                </h1>
                <p className={styles.heroDescription}>
                  {homeHeroContent.descriptionLines.map((line, index) => (
                    <span key={line}>
                      {line}
                      {index < homeHeroContent.descriptionLines.length - 1 ? <br /> : null}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.content} aria-labelledby="home-rules-title">
          <div className={styles.container}>
            <div className={styles.contentGrid}>
              <div className={styles.symbolSection}>
                <div className={styles.symbolFrame}>
                  <img
                    src={`${assetBasePath}logo.png`}
                    alt="Bangchelin symbol"
                    className={styles.symbolImage}
                  />
                </div>
              </div>

              <div className={styles.rulePanel}>
                <h2 id="home-rules-title" className={styles.ruleTitle}>
                  빠르게 보는 톡방 규칙
                </h2>

                {quickRuleSections.map((section) => (
                  <section key={section.title} className={styles.ruleSection}>
                    <h3 className={styles.ruleSectionTitle}>{section.title}</h3>
                    <ul className={styles.ruleList}>
                      {section.items.map((item) => (
                        <li key={item} className={styles.ruleItem}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}

                <div className={styles.ctaRow}>
                  {homeCtas.map((cta) => (
                    <Link
                      key={cta.key}
                      to={cta.to}
                      className={`${styles.cta} ${
                        cta.variant === 'primary' ? styles.ctaPrimary : styles.ctaSecondary
                      }`}
                    >
                      {cta.label} →
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}