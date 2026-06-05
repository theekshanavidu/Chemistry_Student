import React, { useState } from "react";
import { registerStudent } from "../services/authService";
import { saveStudentProfile, isNICUnique } from "../db/firestoreService";
import { auth } from "../config/firebase";
import { signOut } from "firebase/auth";

const generateStudentIdForYear = (batch) => {
  let prefix = "26"; // Default starting digits
  if (batch) {
    const match = batch.match(/\d{4}/);
    if (match) {
      prefix = match[0].substring(2); // e.g. "26" from "2026AL"
    }
  }
  const randomPart = Math.floor(10000000 + Math.random() * 90000000).toString(); // 8 digits
  return prefix + randomPart;
};

const sriLankanSchools = [
  "Ananda College", "Nalanda College", "Dharmaraja College", "Trinity College",
  "Kegalu Vidyalaya", "Richmond College", "Mahinda College", "S. Thomas' College",
  "Royal College", "Colombo National School", "Vidyartha College", "Thurstan College",
  "Mahamaya Girls' College", "Devi Balika Vidyalaya", "Visakha Vidyalaya",
  "Holy Family Convent", "Good Shepherd Convent", "Maliyadeva College",
  "Ratnawali Balika Vidyalaya", "Rahula College", "Piliyandala Central College",
  "Taxila Central College", "Bandarawela Central College", "Uva National School",
  "Badulla National School", "Zahira College", "Al-Azhar College",
  "Ferguson High School", "Sirimavo Bandaranaike Vidyalaya", "Other",
];

const inputCls =
  "w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all bg-white dark:bg-gray-800";
const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";

export default function Register({ onNavigate, theme, toggleTheme }) {
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", password: "",
    gender: "", mobile: "", otherMobile: "", whatsapp: "",
    nic: "", birthday: "", batch: "", school: "",
    homeCity: "", address: "",
    studentId: "", // Generated dynamically when batch is selected
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [whatsappSameAsMobile, setWhatsappSameAsMobile] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "batch") {
      const newId = generateStudentIdForYear(value);
      setFormData((prev) => ({
        ...prev,
        batch: value,
        studentId: newId,
      }));
    } else if (name === "mobile") {
      setFormData((prev) => {
        const updated = { ...prev, mobile: value };
        if (whatsappSameAsMobile) {
          updated.whatsapp = value;
        }
        return updated;
      });
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleWhatsappCheckboxChange = (e) => {
    const checked = e.target.checked;
    setWhatsappSameAsMobile(checked);
    if (checked) {
      setFormData((prev) => ({ ...prev, whatsapp: prev.mobile }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) { setError("Privacy Policy සහ Terms වලට එකඟ විය යුතුය."); return; }
    if (!formData.gender) { setError("Gender තෝරන්න."); return; }
    if (!formData.batch)  { setError("A/L Batch එක තෝරන්න."); return; }
    if (!formData.school) { setError("ඔබේ පාසල තෝරන්න."); return; }

    setLoading(true);
    setError("");
    try {
      // 1. Create the Firebase Auth account first (needed for Firestore auth rules)
      const user = await registerStudent(formData.email, formData.password);

      // 2. NOW check NIC uniqueness — user is authenticated so Firestore rules pass
      const nicUnique = await isNICUnique(formData.nic);
      if (!nicUnique) {
        // Rollback: delete the auth account we just created
        await user.delete();
        setError("මෙම NIC අංකය දැනටමත් ලියාපදිංචි කර ඇත.");
        setLoading(false);
        return;
      }

      // 3. Save profile to Firestore
      const { password, ...profileData } = formData;
      await saveStudentProfile(user.uid, profileData, true); // isNew=true
      await signOut(auth); // Sign out immediately — redirect to login
      setSuccess(true);
    } catch (err) {
      const messages = {
        "auth/email-already-in-use": "මෙම Email ලිපිනය දැනටමත් ලියාපදිංචි කර ඇත.",
        "auth/weak-password":        "Password අවම වශයෙන් අක්ෂර 6ක් විය යුතුය.",
        "auth/invalid-email":        "Email ලිපිනය නිවැරදිව ඇතුළු කරන්න.",
        "auth/network-request-failed": "Network සම්බන්ධතාව පරීක්ෂා කරන්න.",
      };
      setError(messages[err.code] || err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Success Screen ───────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0b0f19] flex items-center justify-center p-6 transition-colors duration-200">
        <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 p-10 max-w-md w-full text-center transition-colors duration-200">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">ලියාපදිංචිය සාර්ථකයි! 🎉</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">ඔබේ ශිෂ්‍ය ගිණුම සාර්ථකව සෑදා ඇත.</p>
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-4 mb-4">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">ඔබේ Student ID</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-450 tracking-widest font-mono">{formData.studentId}</p>
          </div>
          <p className="text-gray-400 dark:text-gray-500 text-xs mb-6">
            {formData.firstName} {formData.lastName} · {formData.batch}
          </p>
          <button
            onClick={() => onNavigate("login")}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-3 px-6 rounded-lg transition-colors text-sm mb-6 cursor-pointer"
          >
            Login වෙන්න
          </button>
          <div className="text-center text-gray-400 dark:text-gray-500 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400">SKCHEM.COM - Sajith K Kumara</p>
            <p className="text-[10px] font-medium">Copyright &copy; Theekshana Viduranga <span className="font-mono">&lt;/&gt;</span></p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Layout ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-[#0b0f19] transition-colors duration-200">
      {/* ── Left: Hero Image ── */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-shrink-0">
        <img
          src="/register_hero.png"
          alt="SKCHEM.COM Student"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/70 via-blue-900/30 to-transparent dark:from-black/85 dark:via-black/45" />
      </div>

      {/* ── Right: Scrollable Form Panel ── */}
      <div className="flex-1 bg-white dark:bg-[#111827] flex flex-col relative transition-colors duration-200">
        
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          type="button"
          className="absolute top-6 right-6 p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700 shadow-sm cursor-pointer z-50"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m12.728 12.728A9 9 0 115.636 5.636 9 9 0 0118.364 18.364z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Inner scroll container */}
        <div className="flex-1 overflow-y-auto px-8 py-10">
          <div className="max-w-sm mx-auto">
            {/* Logo */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-black text-base">S</span>
              </div>
              <span className="text-gray-800 dark:text-white font-bold text-lg tracking-tight">SKCHEM.COM</span>
            </div>

            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Adventure starts here</h1>

            {/* Error */}
            {error && (
              <div className="mb-4 flex items-start gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* First Name */}
              <div>
                <label className={labelCls}>First Name</label>
                <input type="text" name="firstName" required
                  placeholder="Enter your First Name"
                  value={formData.firstName}
                  onChange={handleChange} className={inputCls} />
              </div>

              {/* Last Name */}
              <div>
                <label className={labelCls}>Last Name</label>
                <input type="text" name="lastName" required
                  placeholder="Enter your Last Name"
                  value={formData.lastName}
                  onChange={handleChange} className={inputCls} />
              </div>

              {/* Email */}
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" name="email" required
                  placeholder="Enter your Email"
                  value={formData.email}
                  onChange={handleChange} className={inputCls} />
              </div>

              {/* Password */}
              <div>
                <label className={labelCls}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password" required
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={handleChange}
                    className={`${inputCls} pr-11`}
                  />
                  <button type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650 dark:hover:text-gray-300 cursor-pointer">
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Mobile */}
              <div>
                <label className={labelCls}>Mobile</label>
                <input type="tel" name="mobile" required
                  placeholder="0777123456"
                  value={formData.mobile}
                  onChange={handleChange} className={inputCls} />
              </div>

              {/* WhatsApp */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">WhatsApp Number</label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsappSameAsMobile}
                      onChange={handleWhatsappCheckboxChange}
                      className="w-3.5 h-3.5 accent-red-600 rounded cursor-pointer"
                    />
                    Same as Mobile
                  </label>
                </div>
                <input type="tel" name="whatsapp" required
                  placeholder="0777123456"
                  value={formData.whatsapp}
                  disabled={whatsappSameAsMobile}
                  onChange={handleChange} className={`${inputCls} ${whatsappSameAsMobile ? "bg-gray-100 dark:bg-gray-900 cursor-not-allowed text-gray-400 dark:text-gray-500" : ""}`} />
              </div>

              {/* Other Mobile (optional) */}
              <div>
                <label className={labelCls}>Other Mobile <span className="text-gray-400 dark:text-gray-500 text-xs font-normal">(Optional)</span></label>
                <input type="tel" name="otherMobile"
                  placeholder="0717654321"
                  value={formData.otherMobile}
                  onChange={handleChange} className={inputCls} />
              </div>

              {/* NIC */}
              <div>
                <label className={labelCls}>NIC</label>
                <input type="text" name="nic" required
                  placeholder="200012345678"
                  value={formData.nic}
                  onChange={handleChange} className={inputCls} />
              </div>

              {/* Birthday */}
              <div>
                <label className={labelCls}>Birthday</label>
                <input type="date" name="birthday" required
                  value={formData.birthday}
                  onChange={handleChange} className={inputCls} />
              </div>

              {/* Gender */}
              <div>
                <label className={labelCls}>Gender</label>
                <div className="relative">
                  <select name="gender" value={formData.gender}
                    onChange={handleChange}
                    className={`${inputCls} appearance-none cursor-pointer pr-10`}>
                    <option value="" className="bg-white dark:bg-gray-800">Select value</option>
                    <option value="Male" className="bg-white dark:bg-gray-800">Male</option>
                    <option value="Female" className="bg-white dark:bg-gray-800">Female</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </div>
              </div>

              {/* Batch */}
              <div>
                <label className={labelCls}>Batch</label>
                <div className="relative">
                  <select name="batch" value={formData.batch}
                    onChange={handleChange}
                    className={`${inputCls} appearance-none cursor-pointer pr-10`}>
                    <option value="" className="bg-white dark:bg-gray-800">Select value</option>
                    <option value="2026AL" className="bg-white dark:bg-gray-800">2026 A/L</option>
                    <option value="2027AL" className="bg-white dark:bg-gray-800">2027 A/L</option>
                    <option value="2028AL" className="bg-white dark:bg-gray-800">2028 A/L</option>
                    <option value="2026Rapid" className="bg-white dark:bg-gray-800">2026 Rapid</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </div>
              </div>

              {/* School */}
              <div>
                <label className={labelCls}>Select Your School</label>
                <div className="relative">
                  <select name="school" value={formData.school}
                    onChange={handleChange}
                    className={`${inputCls} appearance-none cursor-pointer pr-10`}>
                    <option value="" className="bg-white dark:bg-gray-800">Select your school</option>
                    {sriLankanSchools.map((s) => (
                      <option key={s} value={s} className="bg-white dark:bg-gray-800">{s}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </div>
              </div>

              {/* Home City */}
              <div>
                <label className={labelCls}>Home City / Town</label>
                <input type="text" name="homeCity" required
                  placeholder="Colombo, Kandy, Galle..."
                  value={formData.homeCity}
                  onChange={handleChange} className={inputCls} />
              </div>

              {/* Address */}
              <div>
                <label className={labelCls}>Address</label>
                <input type="text" name="address" required
                  placeholder="No. 123, Street, City"
                  value={formData.address}
                  onChange={handleChange} className={inputCls} />
              </div>

              {/* Privacy Policy */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="agree-terms"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-red-600 cursor-pointer flex-shrink-0"
                />
                <label htmlFor="agree-terms" className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer leading-snug">
                  I agree to{" "}
                  <a href="#" className="text-red-655 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold underline underline-offset-2">
                    privacy policy &amp; terms
                  </a>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                id="register-submit-btn"
                disabled={loading}
                className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-250 dark:disabled:bg-yellow-350/50 disabled:cursor-not-allowed text-gray-900 font-bold py-3 px-6 rounded-lg transition-colors text-sm shadow-sm flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Register වෙමින්...
                  </>
                ) : "Sign up"}
              </button>

              {/* Already have account */}
              <p className="text-center text-sm text-gray-505 dark:text-gray-400 pb-2">
                Already have an account?{" "}
                <button type="button"
                  onClick={() => onNavigate("login")}
                  className="text-red-650 dark:text-red-400 hover:text-red-750 dark:hover:text-red-300 font-semibold cursor-pointer">
                  Sign in instead
                </button>
              </p>

              <div className="text-center text-gray-400 dark:text-gray-500 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
                <p className="text-xs font-bold text-gray-650 dark:text-gray-400">SKCHEM.COM - Sajith K Kumara</p>
                <p className="text-[10px] font-medium">Copyright &copy; Theekshana Viduranga <span className="font-mono">&lt;/&gt;</span></p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}