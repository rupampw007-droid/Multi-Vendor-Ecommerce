'use client';

import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { CustomizationData } from '@/types/admin';
import Modal from '@/shared/components/modal';
import { useToast } from '@/shared/components/toast';
import {
  getCustomizations,
  newBanner,
  saveCustomizations,
} from '@/utils/adminService';

type EditTarget =
  | { kind: 'category'; oldName: string | null; value: string }
  | { kind: 'subcategory'; category: string; oldName: string | null; value: string }
  | { kind: 'banner'; bannerId: string; value: string };
type DeleteTarget =
  | { kind: 'category'; name: string }
  | { kind: 'subcategory'; category: string; name: string }
  | { kind: 'banner'; bannerId: string; name: string };

const readImage = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Could not read the selected image.'));
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
  });

export default function CustomizationPage() {
  const toast = useToast();
  const [data, setData] = useState<CustomizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [target, setTarget] = useState<EditTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [bannerTitle, setBannerTitle] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getCustomizations());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not load customization settings.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = async (next: CustomizationData, demoMessage?: string) => {
    setSaving(true);
    try {
      const source = await saveCustomizations(next);
      setData(next);
      toast(
        source === 'demo'
          ? demoMessage ?? 'Saved in demo data. The customization endpoint is not available.'
          : 'Customization saved.',
        source === 'demo' ? 'info' : 'success',
      );
    } catch (saveError) {
      toast(
        saveError instanceof Error ? saveError.message : 'Could not save customization.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const uploadBranding = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: 'logo' | 'banner',
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !data) return;
    if (!file.type.startsWith('image/')) {
      toast('Choose an image file.', 'error');
      return;
    }
    if (file.size > 1_500_000) {
      toast('Choose an image smaller than 1.5 MB.', 'error');
      return;
    }
    try {
      const image = await readImage(file);
      await persist({ ...data, [field]: image });
    } catch (uploadError) {
      toast(uploadError instanceof Error ? uploadError.message : 'Image upload failed.', 'error');
    }
  };

  const uploadBanner = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !data) return;
    if (!file.type.startsWith('image/')) {
      toast('Choose an image file.', 'error');
      return;
    }
    if (file.size > 1_500_000) {
      toast('Choose an image smaller than 1.5 MB.', 'error');
      return;
    }
    try {
      const image = await readImage(file);
      const title = bannerTitle.trim() || file.name.replace(/\.[^.]+$/, '');
      const banners = [...data.banners, newBanner(title, image)];
      setBannerTitle('');
      await persist({ ...data, banners, banner: data.banner ?? image });
    } catch (uploadError) {
      toast(uploadError instanceof Error ? uploadError.message : 'Banner upload failed.', 'error');
    }
  };

  const saveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data || !target || !target.value.trim()) return;
    const value = target.value.trim();
    let next = data;
    if (target.kind === 'category') {
      const oldName = target.oldName;
      if (data.categories.some((category) => category.toLowerCase() === value.toLowerCase() && category !== oldName)) {
        toast('That category already exists.', 'error');
        return;
      }
      const categories = oldName
        ? data.categories.map((category) => category === oldName ? value : category)
        : [...data.categories, value];
      const subCategories = { ...data.subCategories };
      if (oldName && oldName !== value) {
        subCategories[value] = subCategories[oldName] ?? [];
        delete subCategories[oldName];
      }
      next = { ...data, categories, subCategories };
    } else if (target.kind === 'subcategory') {
      const current = data.subCategories[target.category] ?? [];
      if (current.some((item) => item.toLowerCase() === value.toLowerCase() && item !== target.oldName)) {
        toast('That subcategory already exists in this category.', 'error');
        return;
      }
      next = {
        ...data,
        subCategories: {
          ...data.subCategories,
          [target.category]: target.oldName
            ? current.map((item) => item === target.oldName ? value : item)
            : [...current, value],
        },
      };
    } else {
      next = {
        ...data,
        banners: data.banners.map((banner) =>
          banner.id === target.bannerId ? { ...banner, title: value } : banner,
        ),
      };
    }
    setTarget(null);
    await persist(next);
  };

  const removeItem = async () => {
    if (!data || !deleteTarget) return;
    let next = data;
    if (deleteTarget.kind === 'category') {
      const subCategories = { ...data.subCategories };
      delete subCategories[deleteTarget.name];
      next = {
        ...data,
        categories: data.categories.filter((item) => item !== deleteTarget.name),
        subCategories,
      };
    } else if (deleteTarget.kind === 'subcategory') {
      next = {
        ...data,
        subCategories: {
          ...data.subCategories,
          [deleteTarget.category]: (data.subCategories[deleteTarget.category] ?? []).filter(
            (item) => item !== deleteTarget.name,
          ),
        },
      };
    } else {
      const banners = data.banners.filter((banner) => banner.id !== deleteTarget.bannerId);
      next = { ...data, banners, banner: banners[0]?.image ?? null };
    }
    setDeleteTarget(null);
    await persist(next);
  };

  const reorderBanner = async (index: number, direction: -1 | 1) => {
    if (!data) return;
    const destination = index + direction;
    if (destination < 0 || destination >= data.banners.length) return;
    const banners = [...data.banners];
    [banners[index], banners[destination]] = [banners[destination], banners[index]];
    await persist({ ...data, banners, banner: banners[0]?.image ?? null });
  };

  if (loading) {
    return <div className="route-loading"><span className="loading-spinner" />Loading customization settings…</div>;
  }
  if (error || !data) {
    return (
      <div className="inline-error" role="alert">
        <span>{error || 'Customization settings are unavailable.'}</span>
        <button type="button" className="button button-secondary button-small" onClick={() => void load()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Storefront experience</div>
          <h1>All Customization</h1>
          <p>Manage your catalog structure, platform branding, and promotional banners.</p>
        </div>
        {saving && <span className="saving-indicator"><span className="loading-spinner" /> Saving changes…</span>}
      </div>
      <section className="panel customization-section">
        <div className="section-title-row">
          <div>
            <div className="panel-eyebrow">Catalog</div>
            <h2>Categories &amp; subcategories</h2>
            <p>Organize your storefront catalog into clear groups.</p>
          </div>
          <button
            type="button"
            className="button button-secondary"
            disabled={saving}
            onClick={() => setTarget({ kind: 'category', oldName: null, value: '' })}
          >
            <Plus size={16} /> Add category
          </button>
        </div>
        {data.categories.length === 0 ? (
          <p className="empty-customization">No categories yet. Add one to get started.</p>
        ) : (
          <div className="category-list">
            {data.categories.map((category) => (
              <article className="category-card" key={category}>
                <header className="category-card-header">
                  <div>
                    <span className="category-dot" />
                    <strong>{category}</strong>
                    <span className="category-count">{(data.subCategories[category] ?? []).length} subcategories</span>
                  </div>
                  <div className="icon-action-group">
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Edit ${category}`}
                      onClick={() => setTarget({ kind: 'category', oldName: category, value: category })}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      aria-label={`Delete ${category}`}
                      onClick={() => setDeleteTarget({ kind: 'category', name: category })}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </header>
                <div className="subcategory-list">
                  {(data.subCategories[category] ?? []).map((subCategory) => (
                    <div className="subcategory-item" key={subCategory}>
                      <span>{subCategory}</span>
                      <div className="icon-action-group">
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Edit ${subCategory}`}
                          onClick={() =>
                            setTarget({
                              kind: 'subcategory',
                              category,
                              oldName: subCategory,
                              value: subCategory,
                            })
                          }
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          className="icon-button icon-button-danger"
                          aria-label={`Delete ${subCategory}`}
                          onClick={() =>
                            setDeleteTarget({ kind: 'subcategory', category, name: subCategory })
                          }
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="add-subcategory"
                    onClick={() =>
                      setTarget({
                        kind: 'subcategory',
                        category,
                        oldName: null,
                        value: '',
                      })
                    }
                  >
                    <Plus size={14} /> Add subcategory
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="customization-grid">
        <article className="panel customization-section">
          <div className="panel-eyebrow">Brand identity</div>
          <h2>Platform logo</h2>
          <p className="section-description">Upload or replace the logo used across the storefront.</p>
          <div className="branding-preview">
            {data.logo ? (
              <img src={data.logo} alt="Current platform logo preview" />
            ) : (
              <span className="branding-placeholder"><ImagePlus size={24} /> Logo preview</span>
            )}
          </div>
          <label className="button button-secondary upload-button">
            <Upload size={16} />
            {data.logo ? 'Replace logo' : 'Upload logo'}
            <input type="file" accept="image/*" onChange={(event) => void uploadBranding(event, 'logo')} />
          </label>
          {data.logo && (
            <button type="button" className="text-button text-danger" onClick={() => void persist({ ...data, logo: null })}>
              Remove logo
            </button>
          )}
        </article>
        <article className="panel customization-section">
          <div className="panel-eyebrow">Promotion</div>
          <h2>Storefront banner</h2>
          <p className="section-description">Set the primary banner displayed across the storefront.</p>
          <div className="branding-preview banner-preview">
            {data.banner ? (
              <img src={data.banner} alt="Current storefront banner preview" />
            ) : (
              <span className="branding-placeholder"><ImagePlus size={24} /> Banner preview</span>
            )}
          </div>
          <label className="button button-secondary upload-button">
            <Upload size={16} />
            {data.banner ? 'Replace banner' : 'Upload banner'}
            <input type="file" accept="image/*" onChange={(event) => void uploadBranding(event, 'banner')} />
          </label>
          {data.banner && (
            <button type="button" className="text-button text-danger" onClick={() => void persist({ ...data, banner: null })}>
              Remove banner
            </button>
          )}
        </article>
      </section>
      <section className="panel customization-section banners-section">
        <div className="section-title-row">
          <div>
            <div className="panel-eyebrow">Campaigns</div>
            <h2>Promotional banners</h2>
            <p>Upload, preview, reorder, edit, or remove campaign artwork.</p>
          </div>
        </div>
        <div className="banner-upload-row">
          <label className="form-field">
            <span>Banner title</span>
            <input
              value={bannerTitle}
              onChange={(event) => setBannerTitle(event.target.value)}
              placeholder="Spring collection"
            />
          </label>
          <label className="button button-primary upload-button">
            <ImagePlus size={16} /> Upload banner
            <input type="file" accept="image/*" onChange={(event) => void uploadBanner(event)} />
          </label>
        </div>
        {data.banners.length === 0 ? (
          <p className="empty-customization">No campaign banners have been uploaded.</p>
        ) : (
          <div className="banner-list">
            {data.banners.map((banner, index) => (
              <article className="banner-card" key={banner.id}>
                <img src={banner.image} alt={`${banner.title} preview`} />
                <div className="banner-card-copy">
                  <strong>{banner.title}</strong>
                  <span>Position {index + 1}</span>
                </div>
                <div className="icon-action-group">
                  <button type="button" className="icon-button" aria-label="Move banner up" disabled={index === 0} onClick={() => void reorderBanner(index, -1)}>
                    <ArrowUp size={15} />
                  </button>
                  <button type="button" className="icon-button" aria-label="Move banner down" disabled={index === data.banners.length - 1} onClick={() => void reorderBanner(index, 1)}>
                    <ArrowDown size={15} />
                  </button>
                  <button type="button" className="icon-button" aria-label={`Edit ${banner.title}`} onClick={() => setTarget({ kind: 'banner', bannerId: banner.id, value: banner.title })}>
                    <Pencil size={15} />
                  </button>
                  <button type="button" className="icon-button icon-button-danger" aria-label={`Delete ${banner.title}`} onClick={() => setDeleteTarget({ kind: 'banner', bannerId: banner.id, name: banner.title })}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        <p className="form-hint">
          Campaign banner collections are stored in this dashboard&apos;s demo data;
          the backend currently persists only the single storefront banner.
        </p>
      </section>
      {target && (
        <Modal
          title={
            target.kind === 'category'
              ? target.oldName ? 'Edit category' : 'Add category'
              : target.kind === 'subcategory'
                ? target.oldName ? 'Edit subcategory' : 'Add subcategory'
                : 'Edit banner title'
          }
          description={target.kind === 'subcategory' ? `Nested under ${target.category}.` : undefined}
          onClose={() => setTarget(null)}
          footer={
            <>
              <button type="button" className="button button-secondary" onClick={() => setTarget(null)}>Cancel</button>
              <button type="submit" form="customization-edit-form" className="button button-primary" disabled={saving}>Save</button>
            </>
          }
        >
          <form id="customization-edit-form" onSubmit={(event) => void saveEdit(event)}>
            <label className="form-field">
              <span>{target.kind === 'banner' ? 'Banner title' : 'Name'}</span>
              <input autoFocus required value={target.value} onChange={(event) => setTarget({ ...target, value: event.target.value })} />
            </label>
          </form>
        </Modal>
      )}
      {deleteTarget && (
        <Modal
          title={`Delete ${deleteTarget.kind}`}
          description={`Delete “${deleteTarget.name}”? This change cannot be undone.`}
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <button type="button" className="button button-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button type="button" className="button button-danger" disabled={saving} onClick={() => void removeItem()}>Delete</button>
            </>
          }
        >
          <p className="confirmation-copy">
            {deleteTarget.kind === 'category'
              ? 'Its nested subcategories will also be removed.'
              : 'The item will be removed from the storefront settings.'}
          </p>
        </Modal>
      )}
    </>
  );
}