import { useState, useEffect } from 'react';

const SOURCE_LABEL = {
  verite: 'Verite News',
  lens: 'The Lens',
  wwno: 'WWNO',
  tp: 'Times-Picayune',
};

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function NewsFeed() {
  const [articles, setArticles] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/news');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        if (!cancelled) setArticles(data.articles || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">In the News</h2>
        <p className="text-sm text-gray-600">News feed is temporarily unavailable.</p>
      </div>
    );
  }

  if (articles === null) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">In the News</h2>
        <div className="space-y-4">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-100 rounded mb-1" />
              <div className="h-3 bg-gray-100 rounded w-5/6" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">In the News</h2>
        <p className="text-sm text-gray-600">No utility coverage in the past few days.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">In the News</h2>
        <p className="text-sm text-gray-500 mt-1">
          Recent local reporting on Entergy, SWBNO, and Delta Utilities. Updated twice daily.
        </p>
      </div>

      <div className="space-y-5">
        {articles.map(a => (
          <article key={a.url} className="border-b border-gray-100 pb-5 last:border-0 last:pb-0">
            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-base font-semibold text-gray-900 hover:text-blue-700"
            >
              {a.title}
            </a>
            <p className="text-xs text-gray-500 mt-1">
              {SOURCE_LABEL[a.source] || a.source} · {formatDate(a.pub_date)}
            </p>
            {a.summary && <p className="text-sm text-gray-700 mt-2">{a.summary}</p>}
            {a.consumer_implication && (
              <p className="text-sm text-gray-900 mt-2">
                <span className="font-semibold">What it means for you: </span>
                {a.consumer_implication}
              </p>
            )}
          </article>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-5">
        Summaries generated with AI from public reporting — headlines link out to the original article.
      </p>
    </div>
  );
}
