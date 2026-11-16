import React, { useEffect, useState } from 'react';
import { ArrowRight, Croissant, GraduationCap } from 'lucide-react';
import { OrganizerRecapView } from './components/OrganizerRecapView';
import { PreOrderForm } from './components/PreOrderForm';
import { subscribeCampaignSummary } from './services/orderService';
import { CampaignSummary } from './types/order';

const HERO_IMAGE_SRC = '/src/assets/images/hero_pain_au_chocolat_1794813978549.jpg';
const PROJECT_IMAGE_SRC = '/src/assets/images/school_projects_craft_1794813978375.jpg';

export default function App() {
  const [view, setView] = useState<'storefront' | 'organizer'>('storefront');
  const [summary, setSummary] = useState<CampaignSummary | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [projectImgFailed, setProjectImgFailed] = useState(false);

  useEffect(() => {
    const unsub = subscribeCampaignSummary((data) => {
      setSummary(data);
    });
    return () => unsub();
  }, []);

  const openOrganizer = () => {
    setView('organizer');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openStorefront = () => {
    setView('storefront');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1C1917]">
      {/* Top Bar: 3-zone contract */}
      <header className="sticky top-0 z-30 bg-[#FAF9F6]/95 backdrop-blur-xs border-b border-stone-200/90 no-print">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element Brand wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              if (view === 'organizer') {
                e.preventDefault();
                openStorefront();
              }
            }}
            className="font-display text-lg sm:text-xl font-semibold tracking-tight text-stone-900 whitespace-nowrap shrink-0"
          >
            La Fournée de l&apos;École
          </a>

          {/* Zone 2: 4 concise single-line text links */}
          <nav
            aria-label="Navigation principale"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600"
          >
            <a
              href="#operation"
              onClick={() => view === 'organizer' && setView('storefront')}
              className="hover:text-stone-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              L&apos;opération
            </a>
            <a
              href="#projet"
              onClick={() => view === 'organizer' && setView('storefront')}
              className="hover:text-stone-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Le projet
            </a>
            <a
              href="#precommander"
              onClick={() => view === 'organizer' && setView('storefront')}
              className="hover:text-stone-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Précommander
            </a>
            <a
              href="#infos"
              onClick={() => view === 'organizer' && setView('storefront')}
              className="hover:text-stone-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Infos pratiques
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={view === 'organizer' ? openStorefront : openOrganizer}
              className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900"
            >
              {view === 'organizer' ? 'Voir la précommande' : 'Récapitulatif organisateur'}
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {view === 'organizer' ? (
          <OrganizerRecapView onBack={openStorefront} />
        ) : (
          <>
            {/* Hero Split Section */}
            <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
                <div className="lg:col-span-6 flex flex-col justify-center py-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-stone-500">
                    <span>Veille des vacances de Noël</span>
                    <span aria-hidden="true">·</span>
                    <span>Tarif unique 1 €</span>
                    <span aria-hidden="true">·</span>
                    <span>Avant le 16 décembre</span>
                  </div>

                  <h1 className="mt-4 font-display text-4xl sm:text-5xl font-semibold tracking-tight text-stone-900 leading-[1.1] [text-wrap:balance]">
                    Des pains au chocolat pour financer les sorties de l&apos;école
                  </h1>

                  <p className="mt-5 text-base sm:text-lg text-stone-600 leading-relaxed max-w-xl">
                    À chaque veille de vacances, nous organisons une vente de pains au chocolat à
                    l&apos;école au prix de <strong className="font-semibold text-stone-900">1 € l&apos;unité</strong>.
                    En précommandant en ligne avant le <strong className="font-semibold text-stone-900">16 décembre</strong>,
                    vous nous permettez de commander la quantité exacte auprès du boulanger.
                  </p>

                  <p className="mt-3 text-sm text-stone-600 leading-relaxed max-w-xl">
                    L&apos;intégralité des bénéfices de cette vente sert à financer les projets
                    pédagogiques et les sorties scolaires des élèves.
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-5">
                    <a
                      href="#precommander"
                      className="h-12 px-6 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-amber-900 hover:bg-amber-950 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900"
                    >
                      <span>Précommander maintenant</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>

                    {summary && summary.totalPastries > 0 && (
                      <p className="text-sm text-stone-600 tabular-nums">
                        <strong className="font-semibold text-stone-900">
                          {summary.totalPastries}
                        </strong>{' '}
                        pain{summary.totalPastries > 1 ? 's' : ''} au chocolat déjà réservé
                        {summary.totalPastries > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <div className="h-72 sm:h-96 lg:h-full min-h-[340px] rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                    {heroImgFailed ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-amber-50 to-stone-100">
                        <Croissant className="w-12 h-12 text-amber-800 mb-3" />
                        <p className="font-display text-lg font-medium text-stone-800">
                          Pains au chocolat artisanaux · 1 €
                        </p>
                      </div>
                    ) : (
                      <img
                        src={HERO_IMAGE_SRC}
                        alt="Pains au chocolat dorés et feuilletés fraîchement sortis du four sur un linge en lin"
                        referrerPolicy="no-referrer"
                        onError={() => setHeroImgFailed(true)}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Key Facts Strip: 3-column full-width row below hero split */}
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 border border-stone-200 rounded-xl bg-white divide-y sm:divide-y-0 sm:divide-x divide-stone-200">
                <div className="p-6">
                  <p className="text-xs font-medium text-stone-500">Prix unitaire</p>
                  <p className="mt-1.5 font-display text-2xl font-semibold text-stone-900 tabular-nums">
                    1,00 €
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Par pain au chocolat, sans limite par famille
                  </p>
                </div>

                <div className="p-6">
                  <p className="text-xs font-medium text-stone-500">Date limite de précommande</p>
                  <p className="mt-1.5 font-display text-2xl font-semibold text-stone-900">
                    Avant le 16 décembre
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Clôture le 15 décembre au soir pour passer commande
                  </p>
                </div>

                <div className="p-6">
                  <p className="text-xs font-medium text-stone-500">Destination des fonds</p>
                  <p className="mt-1.5 font-display text-2xl font-semibold text-stone-900">
                    Projets &amp; sorties
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    100 % dédiés aux activités scolaires de l&apos;école
                  </p>
                </div>
              </div>
            </section>

            {/* Operation & School Projects Section */}
            <section
              id="operation"
              className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 border-t border-stone-200"
            >
              <div id="projet" className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                <div className="lg:col-span-5">
                  <div className="aspect-[4/3] rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                    {projectImgFailed ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-stone-100 to-amber-50">
                        <GraduationCap className="w-12 h-12 text-amber-800 mb-3" />
                        <p className="font-display text-lg font-medium text-stone-800">
                          Projets et sorties scolaires
                        </p>
                      </div>
                    ) : (
                      <img
                        src={PROJECT_IMAGE_SRC}
                        alt="Table de classe préparée avec des carnets d'aquarelle, crayons et sacs à dos pour les sorties nature de l'école"
                        referrerPolicy="no-referrer"
                        onError={() => setProjectImgFailed(true)}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-6">
                  <div>
                    <p className="text-xs font-medium text-amber-900">
                      Comment fonctionne la vente
                    </p>
                    <h2 className="mt-2 font-display text-3xl font-semibold text-stone-900 tracking-tight [text-wrap:balance]">
                      Une organisation simple pour éviter le gaspillage et soutenir l&apos;école
                    </h2>
                  </div>

                  <div className="divide-y divide-stone-200 border-y border-stone-200">
                    <div className="py-4">
                      <h3 className="text-base font-semibold text-stone-900">
                        01. Précommandez avant le 16 décembre
                      </h3>
                      <p className="mt-1 text-sm text-stone-600 leading-relaxed">
                        Indiquez le prénom et le nom de votre enfant, votre adresse e-mail et le
                        nombre de pains au chocolat souhaité (1 € l&apos;unité).
                      </p>
                    </div>

                    <div className="py-4">
                      <h3 className="text-base font-semibold text-stone-900">
                        02. Nous commandons la quantité exacte
                      </h3>
                      <p className="mt-1 text-sm text-stone-600 leading-relaxed">
                        Dès la clôture des précommandes, l&apos;école transmet le total exact au
                        boulanger afin que chaque enfant soit servi sans surplus.
                      </p>
                    </div>

                    <div className="py-4">
                      <h3 className="text-base font-semibold text-stone-900">
                        03. Distribution la veille des vacances &amp; financement des sorties
                      </h3>
                      <p className="mt-1 text-sm text-stone-600 leading-relaxed">
                        Les pains au chocolat sont remis le dernier jour avant les vacances. Chaque
                        euro récolté finance directement les sorties culturelles, classes nature et
                        projets des classes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Pre-Order Form Section */}
            <section
              id="precommander"
              className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 border-t border-stone-200"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
                <div id="infos" className="lg:col-span-5 space-y-6">
                  <div>
                    <p className="text-xs font-medium text-amber-900">Précommande en ligne</p>
                    <h2 className="mt-2 font-display text-3xl font-semibold text-stone-900 tracking-tight [text-wrap:balance]">
                      Réservez vos pains au chocolat
                    </h2>
                    <p className="mt-3 text-sm sm:text-base text-stone-600 leading-relaxed">
                      Remplissez une fiche par enfant afin de faciliter la distribution dans les
                      classes la veille des vacances.
                    </p>
                  </div>

                  <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
                    <h3 className="font-display text-lg font-semibold text-stone-900">
                      Informations pratiques
                    </h3>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between gap-4 pb-3 border-b border-stone-100">
                        <dt className="text-stone-500">Tarif</dt>
                        <dd className="font-semibold text-stone-900 tabular-nums">1 € / unité</dd>
                      </div>
                      <div className="flex justify-between gap-4 pb-3 border-b border-stone-100">
                        <dt className="text-stone-500">Date limite</dt>
                        <dd className="font-semibold text-stone-900">Avant le 16 décembre</dd>
                      </div>
                      <div className="flex justify-between gap-4 pb-3 border-b border-stone-100">
                        <dt className="text-stone-500">Remise</dt>
                        <dd className="font-medium text-stone-900 text-right">
                          Veille des vacances scolaires
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-stone-500">Bénéfices</dt>
                        <dd className="font-medium text-stone-900 text-right">
                          Projets et sorties scolaires
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <PreOrderForm />
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-stone-200 bg-white mt-12 no-print">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm font-semibold text-stone-900">
              La Fournée de l&apos;École
            </span>
            <span aria-hidden="true">·</span>
            <span>Vente au profit des projets et sorties scolaires</span>
          </div>

          <div className="flex items-center gap-5">
            <a
              href="#precommander"
              onClick={() => view === 'organizer' && setView('storefront')}
              className="hover:text-stone-900 transition-colors whitespace-nowrap"
            >
              Précommander
            </a>
            <button
              type="button"
              onClick={openOrganizer}
              className="hover:text-stone-900 transition-colors whitespace-nowrap cursor-pointer"
            >
              Récapitulatif organisateur
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
