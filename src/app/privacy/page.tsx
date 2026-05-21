export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl p-6 text-slate-200">
      <h1 className="text-3xl font-bold">Privacy</h1>
      <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
        <p>SlipSense stores ticket and bankroll data in your browser local storage so your entries persist on your device.</p>
        <p>For screenshot analysis, uploaded images are sent to the app backend for parsing. Avoid uploading sensitive personal data.</p>
        <p>We do not ask for banking credentials, sportsbook passwords, or government ID in this app flow.</p>
        <p>If you clear browser storage, switch devices, or use private browsing mode, your local data may be lost.</p>
      </div>
    </main>
  );
}
