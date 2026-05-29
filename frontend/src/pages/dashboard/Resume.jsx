import { useEffect, useRef, useState } from 'react'
import { FiFileText, FiSave, FiTrash2, FiUploadCloud, FiDownload, FiPaperclip } from 'react-icons/fi'
import { meApi } from '../../services/api.js'

const EMPTY = { headline: '', summary: '', content_text: '' }
const ACCEPT = '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'

export default function Resume() {
  const [form, setForm] = useState(EMPTY)
  const [existing, setExisting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const load = () => {
    setLoading(true)
    meApi
      .getResume()
      .then((r) => {
        setExisting(r)
        setForm({ headline: r.headline || '', summary: r.summary || '', content_text: r.content_text })
      })
      .catch((e) => {
        if (e?.response?.status === 404) {
          setExisting(null)
          setForm(EMPTY)
        } else {
          setErr(e?.response?.data?.detail || 'Could not load resume.')
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    setBusy(true)
    try {
      const r = await meApi.upsertResume({
        headline: form.headline || null,
        summary: form.summary || null,
        content_text: form.content_text,
      })
      setExisting(r)
      setMsg(existing ? 'Resume updated.' : 'Resume saved.')
    } catch (e) {
      setErr(e?.response?.data?.detail?.[0]?.msg || e?.response?.data?.detail || 'Could not save resume.')
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async () => {
    if (!window.confirm('Delete your resume and any attached file? This cannot be undone.')) return
    setBusy(true)
    try {
      await meApi.deleteResume()
      setExisting(null)
      setForm(EMPTY)
      setMsg('Resume deleted.')
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Could not delete resume.')
    } finally {
      setBusy(false)
    }
  }

  const handleFile = async (file) => {
    if (!file) return
    setErr(null)
    setMsg(null)
    setUploading(true)
    setUploadProgress(0)
    try {
      const r = await meApi.uploadResume(file, (e) => {
        if (e?.total) setUploadProgress(Math.round((e.loaded / e.total) * 100))
      })
      setExisting(r)
      setForm({ headline: r.headline || '', summary: r.summary || '', content_text: r.content_text })
      setMsg(`Uploaded ${r.original_filename}. Resume text auto-extracted — review below.`)
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Upload failed.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
  }

  const onDownload = async () => {
    try {
      await meApi.downloadResume(existing?.original_filename || 'resume')
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Download failed.')
    }
  }

  if (loading) return <div className="card p-8 text-slate-500">Loading resume…</div>

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold">Resume</h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload a PDF, DOCX, or TXT — we extract the text automatically. Or paste resume text directly. Either way,
          the AI matcher uses your resume content to rank jobs.
        </p>
      </header>

      {err && <Alert kind="error">{err}</Alert>}
      {msg && <Alert kind="success">{msg}</Alert>}

      {/* Upload dropzone */}
      <section
        className={`card p-6 transition ${dragOver ? 'ring-2 ring-brand-500' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <FiUploadCloud size={22} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold">Upload resume file</h2>
            <p className="mt-1 text-sm text-slate-600">PDF, DOCX, or TXT — max 5 MB. Replaces your current resume.</p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="btn-primary"
              >
                {uploading ? `Uploading… ${uploadProgress}%` : 'Choose file'}
              </button>
              <span className="text-xs text-slate-500">or drop a file anywhere on this card</span>
            </div>
            {uploading && (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-brand-600 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Existing file metadata + download */}
      {existing && (
        <div className="card flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3 text-sm">
            <FiFileText className="text-brand-600" size={22} />
            <div>
              <div className="font-medium text-slate-800">
                {existing.original_filename ? (
                  <span className="inline-flex items-center gap-1">
                    <FiPaperclip className="text-slate-400" /> {existing.original_filename}
                  </span>
                ) : (
                  'Resume on file (text only)'
                )}
              </div>
              <div className="text-xs text-slate-500">
                {existing.file_size != null && <>{formatBytes(existing.file_size)} • </>}
                {existing.content_text.length.toLocaleString()} characters of extracted text • last updated{' '}
                {new Date(existing.updated_at).toLocaleString()}
              </div>
            </div>
          </div>
          {existing.original_filename && (
            <button onClick={onDownload} className="btn-secondary">
              <FiDownload /> Download
            </button>
          )}
        </div>
      )}

      {/* Text editor */}
      <form onSubmit={submit} className="card flex flex-col gap-4 p-6">
        <h2 className="text-base font-semibold">Edit resume text</h2>
        <p className="-mt-2 text-sm text-slate-600">
          This is the text the AI matcher reads. Editing won't replace your uploaded file.
        </p>

        <Field label="Headline" hint="One-line summary of your role and focus">
          <input
            className="input"
            name="headline"
            placeholder="Senior Frontend Engineer · React + TypeScript"
            value={form.headline}
            onChange={onChange}
            maxLength={255}
          />
        </Field>
        <Field label="Summary" hint="2–3 sentences shown to employers in shortlists">
          <textarea
            className="input min-h-[100px]"
            name="summary"
            value={form.summary}
            onChange={onChange}
            maxLength={5000}
          />
        </Field>
        <Field label="Resume content" hint="Auto-populated by upload — feel free to refine. Min 10 chars, 50,000 max.">
          <textarea
            className="input min-h-[280px] font-mono text-xs"
            name="content_text"
            value={form.content_text}
            onChange={onChange}
            required
            minLength={10}
            maxLength={50000}
            placeholder="Paste your resume content here, or upload a file above."
          />
        </Field>

        <div className="flex gap-3">
          <button className="btn-primary" disabled={busy}>
            <FiSave /> {busy ? 'Saving…' : existing ? 'Save text changes' : 'Save resume'}
          </button>
          {existing && (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="btn-secondary text-red-700 hover:bg-red-50"
            >
              <FiTrash2 /> Delete resume
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

function Alert({ kind, children }) {
  const cls =
    kind === 'success'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : 'bg-red-50 text-red-700 ring-red-200'
  return <div className={`rounded-lg px-3 py-2 text-sm ring-1 ${cls}`}>{children}</div>
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}
