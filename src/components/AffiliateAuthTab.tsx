import React, { useEffect, useMemo, useState } from 'react';
import { LogIn, LogOut, ShieldCheck, UserCheck, Users, CheckCircle2, Upload, KeyRound, Trash2, Search } from 'lucide-react';
import { BRAZILIAN_STATES, CONAE_ASSETS } from '../data/conaeSeed';
import { BOOTSTRAPPED_ADMIN_EMAIL, isPresidentMasterPassword, sha256Hex } from '../firebase';
import { compressImageFile } from '../utils/imageUpload';
import type { CredentialPass, ExecutiveMandate, PublicAffiliate, UserProfile, VipExecutiveHash } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { MandatesAndReportsPanel } from './MandatesAndReportsPanel';

interface AffiliateAuthTabProps {
  firebaseUid: string | null;
  firebaseEmail: string | null;
  isAdmin?: boolean;
  profile: UserProfile | null;
  usersList?: UserProfile[];
  publicAffiliates: PublicAffiliate[];
  userCredentialPasses?: CredentialPass[];
  vipExecutiveHashes?: VipExecutiveHash[];
  onGoogleLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onSaveProfile: (data: {
    displayName: string;
    phone: string;
    state: string;
    cpf: string;
    loginUsername: string;
    loginPassword?: string;
    photoUrl: string;
  }) => Promise<void>;
  onDeleteRegistration?: (targetUid: string) => Promise<void>;
  onGoToShareholders?: () => void;
  userMandates?: ExecutiveMandate[];
  onSubmitMandateReport?: (params: {
    mandate: ExecutiveMandate;
    city: string;
    partnerName: string;
    partnerDiscountPercent: number;
    partnerStars?: number;
    executionReport: string;
    submittedBy: string;
    status: 'em_execucao' | 'relatorio_enviado';
  }) => Promise<void>;
}

export const AffiliateAuthTab: React.FC<AffiliateAuthTabProps> = ({
  firebaseUid,
  firebaseEmail,
  isAdmin = false,
  profile,
  usersList = [],
  publicAffiliates,
  userCredentialPasses = [],
  vipExecutiveHashes = [],
  onGoogleLogin,
  onLogout,
  onSaveProfile,
  onDeleteRegistration,
  onGoToShareholders,
  userMandates = [],
  onSubmitMandateReport,
}) => {
  const { isEn, tr, translateDynamic } = useLanguage();
  const numLocale = isEn ? 'en-US' : 'pt-BR';

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [stateUf, setStateUf] = useState(profile?.state || 'GO');
  const [cpf, setCpf] = useState(profile?.cpf || '');
  const [loginUsername, setLoginUsername] = useState(profile?.loginUsername || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [authPin, setAuthPin] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState(profile?.photoUrl || CONAE_ASSETS.emblemHeart);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmSelfDelete, setConfirmSelfDelete] = useState(false);
  const [confirmListDeleteUid, setConfirmListDeleteUid] = useState<string | null>(null);
  const [selectedDeleteUid, setSelectedDeleteUid] = useState('');
  const [confirmDropdownDelete, setConfirmDropdownDelete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [adminDeleteMsg, setAdminDeleteMsg] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const manageableUsers = useMemo(() => {
    const map = new Map<
      string,
      {
        uid: string;
        displayName: string;
        email: string;
        state: string;
        vipTier: string;
        photoUrl: string;
        monthlyPlanActive: boolean;
      }
    >();

    for (const u of usersList) {
      if (
        !u.uid ||
        u.uid === firebaseUid ||
        u.email === BOOTSTRAPPED_ADMIN_EMAIL ||
        u.role === 'president'
      ) {
        continue;
      }
      map.set(u.uid, {
        uid: u.uid,
        displayName: u.displayName || u.loginUsername || u.email || tr('Afiliado sem nome', 'Unnamed Affiliate'),
        email: u.email || '',
        state: u.state || 'GO',
        vipTier: u.vipTier || 'Padrao',
        photoUrl: u.photoUrl || CONAE_ASSETS.emblemHeart,
        monthlyPlanActive: Boolean(u.monthlyPlanActive),
      });
    }

    for (const aff of publicAffiliates) {
      if (!aff.uid || aff.uid.startsWith('seed_') || aff.uid === firebaseUid) continue;
      if (!map.has(aff.uid)) {
        map.set(aff.uid, {
          uid: aff.uid,
          displayName: aff.displayName || tr('Afiliado CONAE', 'CONAE Affiliate'),
          email: '',
          state: aff.state || 'GO',
          vipTier: aff.vipTier || 'Padrao',
          photoUrl: aff.photoUrl || CONAE_ASSETS.emblemHeart,
          monthlyPlanActive: false,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName, numLocale)
    );
  }, [usersList, publicAffiliates, firebaseUid, numLocale, tr]);

  useEffect(() => {
    if (manageableUsers.length === 0) {
      setSelectedDeleteUid('');
      setConfirmDropdownDelete(false);
      return;
    }
    if (!manageableUsers.some((u) => u.uid === selectedDeleteUid)) {
      setSelectedDeleteUid(manageableUsers[0].uid);
      setConfirmDropdownDelete(false);
    }
  }, [manageableUsers, selectedDeleteUid]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setPhone(profile.phone || '');
      setStateUf(profile.state || 'GO');
      setCpf(profile.cpf || '');
      setLoginUsername(profile.loginUsername || '');
      setPhotoUrl(profile.photoUrl || CONAE_ASSETS.emblemHeart);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    setAuthError(null);
    try {
      const enteredPin = authPin.trim();
      if (!enteredPin) {
        setAuthError(
          tr(
            'Informe a senha de autorização (Presidência ou Executivo) para salvar o cadastro.',
            'Enter the authorization password (President or Executive) to save your registration.'
          )
        );
        return;
      }
      const isPresident = await isPresidentMasterPassword(enteredPin);
      const pinHash = await sha256Hex(enteredPin);
      const matchedExec = vipExecutiveHashes.find((eh) => eh.active && eh.passwordHash === pinHash);
      if (!isPresident && !matchedExec) {
        setAuthError(
          tr(
            'Senha de autorização incorreta. Não é possível salvar sem senha válida da Presidência ou Executivo.',
            'Incorrect authorization password. Cannot save without a valid President or Executive password.'
          )
        );
        return;
      }

      await onSaveProfile({
        displayName: displayName.trim(),
        phone: phone.trim(),
        state: stateUf,
        cpf: cpf.trim(),
        loginUsername: loginUsername.trim(),
        loginPassword: loginPassword.trim() || undefined,
        photoUrl: photoUrl.trim() || CONAE_ASSETS.emblemHeart,
      });
      setLoginPassword('');
      setAuthPin('');
      setSavedMsg(
        tr(
          `Cadastro salvo com sucesso (autorizado por ${
            isPresident ? 'Presidência CONAE' : `Executivo ${matchedExec?.executiveName}`
          }).`,
          `Registration saved successfully (authorized by ${
            isPresident ? 'CONAE Presidency' : `Executive ${matchedExec?.executiveName}`
          }).`
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSelfDelete = async () => {
    if (!firebaseUid || !onDeleteRegistration) return;
    setAuthError(null);
    setSavedMsg(null);
    const enteredPin = authPin.trim();
    if (!enteredPin && !isAdmin) {
      setAuthError(
        tr(
          'Informe a senha de autorização (Presidência ou Executivo) acima para excluir o cadastro.',
          'Enter the authorization password (President or Executive) above to delete your registration.'
        )
      );
      return;
    }
    if (!isAdmin) {
      const isPresident = await isPresidentMasterPassword(enteredPin);
      const pinHash = await sha256Hex(enteredPin);
      const matchedExec = vipExecutiveHashes.find((eh) => eh.active && eh.passwordHash === pinHash);
      if (!isPresident && !matchedExec) {
        setAuthError(
          tr(
            'Senha de autorização incorreta. Informe a senha válida da Presidência ou Executivo para excluir.',
            'Incorrect authorization password. Enter a valid President or Executive password to delete.'
          )
        );
        return;
      }
    }

    setDeleting(true);
    try {
      await onDeleteRegistration(firebaseUid);
      setDisplayName('');
      setPhone('');
      setCpf('');
      setLoginUsername('');
      setLoginPassword('');
      setAuthPin('');
      setConfirmSelfDelete(false);
      setSavedMsg(
        tr(
          'Cadastro excluído com sucesso da plataforma CONAE.',
          'Registration deleted successfully from the CONAE platform.'
        )
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Auth & Registration Form */}
        <div className="lg:col-span-7 conae-panel rounded-xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-400/20 pb-4">
            <div>
              <p className="text-xs text-amber-300 font-medium">
                {tr(
                  'Afiliados, Colaboradores & Investidores CONAE',
                  'CONAE Affiliates, Staff & Investors'
                )}
              </p>
              <h2 className="text-2xl font-bold text-white">
                {tr('Cadastro & Login de Acesso', 'Sign-Up & Access Login')}
              </h2>
            </div>

            {firebaseUid ? (
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-black/50 border border-amber-400/30 text-xs text-emerald-100 hover:text-white cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-amber-400" />
                {tr('Sair', 'Sign Out')} ({firebaseEmail})
              </button>
            ) : (
              <button
                type="button"
                onClick={onGoogleLogin}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 font-semibold text-sm hover:from-amber-400 hover:to-amber-300 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                {tr('Entrar com Google CONAE', 'Sign In with CONAE Google')}
              </button>
            )}
          </div>

          {!firebaseUid ? (
            <div className="conae-panel-soft rounded-xl p-5 space-y-3 text-sm text-emerald-100/85">
              <div className="flex items-center gap-2 text-amber-300 font-semibold">
                <ShieldCheck className="w-5 h-5" />
                <span>{tr('Autenticação Verificada em 1 Clique', '1-Click Verified Authentication')}</span>
              </div>
              <p className="text-xs leading-relaxed">
                {tr(
                  'Conecte sua conta Google acima para autenticar sua sessão segura no Firebase e liberar o preenchimento do seu cadastro completo de afiliado, definição de login/senha CONAE, foto de perfil, solicitação de pacotes e acesso ao Cartão Virtual.',
                  'Connect your Google account above to authenticate your secure Firebase session and unlock full affiliate registration, CONAE login/password setup, profile photo, package requests, and Virtual Card access.'
                )}
              </p>
              <button
                type="button"
                onClick={onGoogleLogin}
                className="px-4 py-2.5 rounded-lg bg-amber-500 text-neutral-950 font-semibold text-xs hover:bg-amber-400 cursor-pointer"
              >
                {tr('Conectar Agora para Cadastrar Afiliado', 'Connect Now to Register Affiliate')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {savedMsg && (
                <div className="rounded-lg bg-emerald-900/60 border border-emerald-400/40 px-3.5 py-2.5 text-xs text-emerald-100 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{savedMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs text-emerald-100/80 mb-1">
                    {tr('Nome Completo *', 'Full Name *')}
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={tr('Ex: Pr. João Marcos Silva', 'e.g. Pastor John Mark Silva')}
                    className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs text-emerald-100/80 mb-1">
                    {tr('Estado (UF) *', 'State (UF) *')}
                  </label>
                  <select
                    value={stateUf}
                    onChange={(e) => setStateUf(e.target.value)}
                    className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    {BRAZILIAN_STATES.map((uf) => (
                      <option key={uf} value={uf} className="bg-[#061610]">
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-emerald-100/80 mb-1">
                    {tr('WhatsApp / Telefone', 'WhatsApp / Phone')}
                  </label>
                  <input
                    type="text"
                    maxLength={30}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(62) 99999-0000"
                    className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs text-emerald-100/80 mb-1">
                    {tr('CPF / Credencial Ministerial', 'Tax ID (CPF) / Ministerial Credential')}
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs text-emerald-100/80 mb-1">
                    {tr('Login de Usuário CONAE *', 'CONAE Username *')}
                  </label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={50}
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder={tr('Ex: joao.conae2091', 'e.g. john.conae2091')}
                    className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs text-emerald-100/80 mb-1">
                    {tr('Senha Pessoal CONAE', 'Personal CONAE Password')}{' '}
                    {profile?.loginSecretHash ? tr('(Opcional para alterar)', '(Optional to change)') : '*'}
                  </label>
                  <input
                    type="password"
                    minLength={4}
                    maxLength={64}
                    required={!profile?.loginSecretHash}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder={tr('Mínimo 4 caracteres', 'Minimum 4 characters')}
                    className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs text-emerald-100/80">
                  {tr('Foto de Perfil (Upload direto ou URL)', 'Profile Photo (Direct Upload or URL)')}
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    maxLength={60000}
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="flex-1 rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                  <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg conae-panel-soft text-xs font-semibold text-amber-300 hover:text-white cursor-pointer whitespace-nowrap">
                    <Upload className="w-3.5 h-3.5" />
                    {tr('Enviar Foto', 'Upload Photo')}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const dataUrl = await compressImageFile(file, 220);
                        setPhotoUrl(dataUrl);
                      }}
                    />
                  </label>
                </div>
              </div>

              {userCredentialPasses.length > 0 && (
                <div className="conae-panel-soft rounded-lg p-3.5 space-y-2 border border-amber-400/35">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                    <KeyRound className="w-4 h-4" />
                    <span>
                      {tr(
                        'Senhas & Credenciais Liberadas pela Presidência',
                        'Passwords & Credentials Issued by Presidency'
                      )}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {userCredentialPasses.map((cp) => (
                      <div key={cp.id} className="flex items-center justify-between gap-2 bg-black/40 rounded px-3 py-2">
                        <span>
                          <strong className="text-white">{translateDynamic(cp.passType)}</strong>
                          {cp.hotelName ? ` · ${cp.hotelName}` : ''}
                          {cp.goldenCardActive ? tr(' · Cartão Dourado Ativo', ' · Active Gold Card') : ''}
                        </span>
                        <span className="font-mono text-amber-300 font-semibold">
                          {tr('Senha:', 'Password:')} {cp.issuedPasswordPlain}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shareholder Equity Mobile Panel Preview */}
              <div className="conae-panel-soft rounded-lg p-3.5 space-y-2 border border-amber-400/35">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-amber-300">
                    {tr(
                      'Painel de Acionista no Celular (Base 100.000 Ações)',
                      'Mobile Shareholder Panel (100,000 Shares Base)'
                    )}
                  </span>
                  {onGoToShareholders && (
                    <button
                      type="button"
                      onClick={onGoToShareholders}
                      className="text-amber-300 hover:text-white font-semibold cursor-pointer"
                    >
                      {tr('Solicitar Lotes →', 'Request Lots →')}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-black/40 rounded px-3 py-2">
                    <p className="text-[11px] text-emerald-200/70">{tr('Ações Recebidas', 'Shares Held')}</p>
                    <p className="font-mono font-bold text-white tabular-nums">
                      {(profile?.sharesOwned ?? 0).toLocaleString(numLocale)} {tr('ações', 'shares')}
                    </p>
                  </div>
                  <div className="bg-black/40 rounded px-3 py-2">
                    <p className="text-[11px] text-emerald-200/70">{tr('Participação', 'Ownership')}</p>
                    <p className="font-mono font-bold text-amber-300 tabular-nums">
                      {(((profile?.sharesOwned ?? 0) / 100000) * 100).toFixed(3)}%
                    </p>
                  </div>
                  <div className="bg-black/40 rounded px-3 py-2">
                    <p className="text-[11px] text-emerald-200/70">{tr('Registro em Cartório', 'Notary Registration')}</p>
                    <p className="font-mono text-emerald-300 truncate">
                      {profile?.sharesNotaryCode || tr('Pendente Cartório', 'Pending Notary')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Required President or Executive Authorization Password to Save Registration */}
              <div className="conae-panel-soft rounded-lg p-3.5 space-y-2 border border-amber-400/45">
                <label className="block text-xs font-semibold text-amber-300">
                  {tr(
                    'Senha de Autorização para Salvar / Excluir Cadastro (Presidência ou Executivo) *',
                    'Authorization Password to Save / Delete Registration (President or Executive) *'
                  )}
                </label>
                <input
                  type="password"
                  required
                  autoComplete="off"
                  value={authPin}
                  onChange={(e) => setAuthPin(e.target.value)}
                  placeholder={tr(
                    'Digite a senha do Presidente ou de um Executivo credenciado',
                    'Enter the President or an accredited Executive password'
                  )}
                  className="w-full rounded-lg bg-black/55 border border-amber-400/35 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                />
                {authError && (
                  <p className="text-xs text-red-300 font-medium">{authError}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-xs text-emerald-200/75 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <span>
                    {tr('Cargo atual:', 'Current role:')}{' '}
                    <strong className="text-white">{profile?.role || 'affiliate'}</strong> ·{' '}
                    {tr('Nível', 'Tier')} {translateDynamic(profile?.vipTier || 'Padrao')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {onDeleteRegistration &&
                    profile &&
                    firebaseEmail !== BOOTSTRAPPED_ADMIN_EMAIL &&
                    profile.role !== 'president' && (
                      confirmSelfDelete ? (
                        <div className="inline-flex items-center gap-1.5 bg-red-950/75 border border-red-400/45 rounded-lg px-2.5 py-1.5 text-xs">
                          <span className="text-red-200 font-semibold">
                            {tr('Excluir cadastro?', 'Delete registration?')}
                          </span>
                          <button
                            type="button"
                            disabled={deleting}
                            onClick={handleSelfDelete}
                            className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer disabled:opacity-50"
                          >
                            {deleting ? tr('Excluindo...', 'Deleting...') : tr('Confirmar', 'Confirm')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmSelfDelete(false)}
                            className="px-2 py-1 rounded bg-black/55 text-emerald-100 cursor-pointer"
                          >
                            {tr('Cancelar', 'Cancel')}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmSelfDelete(true)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-red-900/80 hover:bg-red-800 border border-red-400/40 text-red-100 font-semibold text-xs sm:text-sm cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          {tr('Excluir Cadastro', 'Delete Registration')}
                        </button>
                      )
                    )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 font-semibold text-sm hover:from-amber-400 hover:to-amber-300 cursor-pointer disabled:opacity-50"
                  >
                    {saving
                      ? tr('Salvando...', 'Saving...')
                      : tr('Salvar Cadastro de Afiliado', 'Save Affiliate Registration')}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* President Direct User Selection & Deletion inside Cadastro Panel */}
          {firebaseUid && isAdmin && onDeleteRegistration && (
            <div className="rounded-xl bg-red-950/35 border border-red-400/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-red-200 flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>
                      {tr(
                        'Excluir Qualquer Cadastro (Pelo seu Login da Presidência)',
                        'Delete Any Registration (Via Your Presidency Login)'
                      )}
                    </span>
                  </p>
                  <p className="text-[11px] text-emerald-100/75 mt-0.5">
                    {tr('Conectado como', 'Signed in as')}{' '}
                    <span className="text-amber-300 font-semibold">{firebaseEmail}</span>.{' '}
                    {tr(
                      'Escolha qualquer pessoa cadastrada abaixo para excluir sem precisar entrar no e-mail dela.',
                      'Choose any registered member below to delete without signing in to their email.'
                    )}
                  </p>
                </div>
                <span className="text-[11px] font-mono text-amber-300">
                  {manageableUsers.length} {tr('cadastrados', 'registered')}
                </span>
              </div>

              {adminDeleteMsg && (
                <div className="rounded-lg bg-emerald-900/60 border border-emerald-400/40 px-3 py-2 text-xs text-emerald-100 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{adminDeleteMsg}</span>
                </div>
              )}

              {manageableUsers.length === 0 ? (
                <p className="text-xs text-emerald-200/70">
                  {tr(
                    'Nenhum outro cadastro de afiliado encontrado no momento.',
                    'No other affiliate registrations found at this time.'
                  )}
                </p>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                  <select
                    value={selectedDeleteUid}
                    onChange={(e) => {
                      setSelectedDeleteUid(e.target.value);
                      setConfirmDropdownDelete(false);
                      setAdminDeleteMsg(null);
                    }}
                    className="flex-1 rounded-lg bg-black/65 border border-red-400/35 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    {manageableUsers.map((u) => (
                      <option key={u.uid} value={u.uid} className="bg-[#061610]">
                        {u.displayName}
                        {u.email ? ` (${u.email})` : ''} · {u.state} ·{' '}
                        {u.monthlyPlanActive
                          ? tr('Cota Paga', 'Quota Paid')
                          : tr('Sem Cota Mensal', 'No Monthly Quota')}
                      </option>
                    ))}
                  </select>

                  {confirmDropdownDelete ? (
                    <div className="inline-flex items-center gap-1.5 bg-red-950/85 border border-red-400/50 rounded-lg px-2.5 py-1.5 text-xs shrink-0">
                      <span className="text-red-200 font-semibold">{tr('Confirmar?', 'Confirm?')}</span>
                      <button
                        type="button"
                        disabled={deleting || !selectedDeleteUid}
                        onClick={async () => {
                          const target = manageableUsers.find((u) => u.uid === selectedDeleteUid);
                          if (!target) return;
                          setDeleting(true);
                          setAdminDeleteMsg(null);
                          try {
                            await onDeleteRegistration(target.uid);
                            setAdminDeleteMsg(
                              tr(
                                `Cadastro de ${target.displayName} excluído com sucesso.`,
                                `Registration for ${target.displayName} deleted successfully.`
                              )
                            );
                          } finally {
                            setDeleting(false);
                            setConfirmDropdownDelete(false);
                          }
                        }}
                        className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer disabled:opacity-50"
                      >
                        {deleting ? tr('Excluindo...', 'Deleting...') : tr('Sim, Excluir', 'Yes, Delete')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDropdownDelete(false)}
                        className="px-2 py-1 rounded bg-black/55 text-emerald-100 cursor-pointer"
                      >
                        {tr('Cancelar', 'Cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!selectedDeleteUid}
                      onClick={() => setConfirmDropdownDelete(true)}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-800/85 hover:bg-red-700 border border-red-400/45 text-white font-semibold text-xs cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {tr('Excluir Cadastro Escolhido', 'Delete Selected Member')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Public Affiliates Showcase */}
        <div className="lg:col-span-5 conae-panel rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-amber-300 font-medium">
                {tr('Rede Credenciada Nacional', 'National Accredited Network')}
              </p>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <span>{tr('Afiliados & Investidores CONAE', 'CONAE Affiliates & Investors')}</span>
              </h3>
            </div>
            <span className="text-xs font-mono text-emerald-300 shrink-0">
              {isAdmin
                ? `${manageableUsers.length} ${tr('reais', 'real')}`
                : `${publicAffiliates.length} ${tr('membros', 'members')}`}
            </span>
          </div>

          {publicAffiliates.length > 0 && (
            <div className="marquee-wrapper overflow-hidden rounded-lg bg-black/45 border border-amber-400/25 py-2 px-1">
              <div className="animate-marquee-investors gap-2 items-center">
                {(() => {
                  const baseList =
                    publicAffiliates.length < 4
                      ? [...publicAffiliates, ...publicAffiliates]
                      : publicAffiliates;
                  return [...baseList, ...baseList].map((aff, idx) => (
                    <div
                      key={`${aff.uid}-tab-marquee-${idx}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-950/75 border border-amber-400/25 px-2.5 py-1 shrink-0"
                    >
                      <img
                        src={aff.photoUrl || CONAE_ASSETS.emblemHeart}
                        alt={aff.displayName}
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-full object-cover border border-amber-400/60 shrink-0"
                      />
                      <div className="leading-tight">
                        <p className="text-[11px] font-semibold text-white whitespace-nowrap">
                          {aff.displayName}
                        </p>
                        <p className="text-[10px] text-amber-300/90 whitespace-nowrap">
                          {aff.state} · {translateDynamic(aff.vipTier)}
                        </p>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-amber-400/75 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tr(
                'Buscar cadastrado por nome, e-mail ou UF...',
                'Search member by name, email or state...'
              )}
              className="w-full rounded-lg bg-black/55 border border-amber-400/30 pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto conae-scroll pr-1.5">
            {(() => {
              const q = searchQuery.trim().toLowerCase();
              const realRows = manageableUsers.map((u) => ({
                ...u,
                isSeed: false,
              }));
              const seedRows = publicAffiliates
                .filter((aff) => aff.uid.startsWith('seed_'))
                .map((aff) => ({
                  uid: aff.uid,
                  displayName: aff.displayName,
                  email: '',
                  state: aff.state,
                  vipTier: aff.vipTier,
                  photoUrl: aff.photoUrl,
                  monthlyPlanActive: true,
                  isSeed: true,
                }));

              const existingRealUids = new Set(realRows.map((r) => r.uid));
              const nonSeedFallback = isAdmin
                ? []
                : publicAffiliates
                    .filter((aff) => !aff.uid.startsWith('seed_') && !existingRealUids.has(aff.uid))
                    .map((aff) => ({
                      uid: aff.uid,
                      displayName: aff.displayName,
                      email: '',
                      state: aff.state,
                      vipTier: aff.vipTier,
                      photoUrl: aff.photoUrl,
                      monthlyPlanActive: false,
                      isSeed: false,
                    }));

              const combined = [...realRows, ...nonSeedFallback, ...seedRows].filter((row) => {
                if (!q) return true;
                return (
                  row.displayName.toLowerCase().includes(q) ||
                  row.email.toLowerCase().includes(q) ||
                  row.state.toLowerCase().includes(q)
                );
              });

              if (combined.length === 0) {
                return (
                  <p className="text-xs text-emerald-200/70 py-4 text-center">
                    {tr(
                      `Nenhum cadastrado encontrado para "${searchQuery}".`,
                      `No member found for "${searchQuery}".`
                    )}
                  </p>
                );
              }

              return combined.map((aff) => {
                const canAdminDelete =
                  isAdmin &&
                  Boolean(onDeleteRegistration) &&
                  !aff.isSeed &&
                  aff.uid !== firebaseUid;
                return (
                  <div
                    key={aff.uid}
                    className="conae-panel-soft rounded-lg p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={aff.photoUrl || CONAE_ASSETS.emblemHeart}
                        alt={aff.displayName}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-full object-cover border border-amber-400/50 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{aff.displayName}</p>
                        {isAdmin && aff.email && (
                          <p className="text-[11px] font-mono text-amber-300/90 truncate">{aff.email}</p>
                        )}
                        <p className="text-xs text-emerald-200/75">
                          {tr('Estado:', 'State:')} {aff.state} · {tr('Nível', 'Tier')}{' '}
                          {translateDynamic(aff.vipTier)}
                          {isAdmin && !aff.isSeed && (
                            <span
                              className={
                                aff.monthlyPlanActive ? ' text-emerald-300' : ' text-red-300'
                              }
                            >
                              {' '}
                              · {aff.monthlyPlanActive ? tr('Cota Paga', 'Quota Paid') : tr('Sem Cota', 'No Quota')}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {canAdminDelete && (
                      confirmListDeleteUid === aff.uid ? (
                        <div className="flex items-center gap-1 text-[11px] shrink-0">
                          <button
                            type="button"
                            disabled={deleting}
                            onClick={async () => {
                              if (!onDeleteRegistration) return;
                              setDeleting(true);
                              setAdminDeleteMsg(null);
                              try {
                                await onDeleteRegistration(aff.uid);
                                setAdminDeleteMsg(
                                  tr(
                                    `Cadastro de ${aff.displayName} excluído.`,
                                    `Registration for ${aff.displayName} deleted.`
                                  )
                                );
                              } finally {
                                setDeleting(false);
                                setConfirmListDeleteUid(null);
                              }
                            }}
                            className="px-2 py-1 rounded bg-red-600 text-white font-bold cursor-pointer"
                          >
                            {tr('Confirmar', 'Confirm')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmListDeleteUid(null)}
                            className="px-2 py-1 rounded bg-black/50 text-emerald-100 cursor-pointer"
                          >
                            {tr('Não', 'No')}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmListDeleteUid(aff.uid)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-900/75 hover:bg-red-800 text-red-100 text-xs font-semibold cursor-pointer shrink-0"
                          title={tr('Excluir cadastro', 'Delete registration')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {tr('Excluir', 'Delete')}
                        </button>
                      )
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {firebaseUid && userMandates.length > 0 && (
        <div className="conae-panel rounded-xl p-4 sm:p-5">
          <MandatesAndReportsPanel
            isPresidentMode={false}
            authorizedLabel={profile?.displayName || firebaseEmail || tr('Afiliado CONAE', 'CONAE Affiliate')}
            usersList={usersList}
            mandates={userMandates}
            onSubmitMandateReport={onSubmitMandateReport}
          />
        </div>
      )}
    </div>
  );
};
