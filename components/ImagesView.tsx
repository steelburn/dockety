import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { useTable } from '../hooks/useTable';
import { Host, Image } from '../types';
import { dockerService } from '../services/dockerService';
import { PullImageModal } from './PullImageModal';

const Trash2Icon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const DownloadCloudIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m8 17 4 4 4-4"/></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
const CubeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;

const ActionButton: React.FC<{ onClick: () => void; children: React.ReactNode; className: string; disabled?: boolean; title: string }> = ({ onClick, children, className, disabled, title }) => (
    <button onClick={onClick} disabled={disabled} title={title} className={`p-2 rounded-md transition-colors ${className} disabled:opacity-50 disabled:cursor-not-allowed`}>
        {children}
    </button>
);

const SortableHeader: React.FC<{
  sortKey: keyof Image;
  title: string;
  requestSort: (key: keyof Image) => void;
  sortConfig: { key: keyof Image | null; direction: 'ascending' | 'descending' };
}> = ({ sortKey, title, requestSort, sortConfig }) => {
  const isSorted = sortConfig.key === sortKey;
  return (
    <th scope="col" className="px-6 py-3">
      <button
        onClick={() => requestSort(sortKey)}
        className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 uppercase hover:text-gray-900 dark:hover:text-white"
      >
        <span>{title}</span>
        {isSorted && <span>{sortConfig.direction === 'ascending' ? '▲' : '▼'}</span>}
      </button>
    </th>
  );
};

interface ImagesViewProps {
  host: Host;
}

export const ImagesView: React.FC<ImagesViewProps> = ({ host }) => {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [isPullModalOpen, setPullModalOpen] = useState(false);
  const { items, requestSort, sortConfig, searchTerm, handleSearchChange } = useTable(images, ['tags', 'id'], 'created');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dockerService.getImages(host.id);
      setImages(data);
    } catch (e) {
      setError('Failed to fetch images.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [host]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleRemove = async (imageId: string) => {
    setProcessing(prev => ({...prev, [imageId]: true}));
    try {
        await dockerService.removeImage(host.id, imageId);
        await fetchData();
    } catch (e) {
        console.error('Failed to remove image', e);
        setError('Failed to remove image.');
    } finally {
        setProcessing(prev => ({...prev, [imageId]: false}));
    }
  };
  
  const handlePullImage = async (imageName: string) => {
      setPullModalOpen(false);
      setLoading(true);
      try {
          await dockerService.pullImage(host.id, imageName);
          await fetchData();
      } catch (e) {
          setError('Failed to pull image.');
          console.error(e);
      } finally {
          setLoading(false);
      }
  };


  if (loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;
  if (error) return <div className="text-red-500 text-center p-6">{error}</div>;

  return (
    <>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Images</h1>
          <div className="flex items-center space-x-2">
            <input
                type="text"
                placeholder="Filter images..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="px-3 py-2 bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
            <button onClick={() => setPullModalOpen(true)} className="flex items-center space-x-2 px-3 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                <DownloadCloudIcon/>
                <span>Pull Image</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <table className="min-w-full text-sm text-left text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th scope="col" className="px-2 py-3 w-12"></th>
                <SortableHeader sortKey="tags" title="Tags" requestSort={requestSort} sortConfig={sortConfig} />
                <SortableHeader sortKey="id" title="Image ID" requestSort={requestSort} sortConfig={sortConfig} />
                <SortableHeader sortKey="size" title="Size" requestSort={requestSort} sortConfig={sortConfig} />
                <SortableHeader sortKey="created" title="Created" requestSort={requestSort} sortConfig={sortConfig} />
                <th scope="col" className="px-6 py-3 text-xs text-gray-500 dark:text-gray-400 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((image) => (
                <Fragment key={image.id}>
                  <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-2 py-4">
                        {image.containers.length > 0 && (
                            <button onClick={() => setExpandedImage(expandedImage === image.id ? null : image.id)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
                               <ChevronDownIcon />
                            </button>
                        )}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        <div className="flex flex-col">
                            {image.tags.map(tag => <span key={tag}>{tag}</span>)}
                             {image.containers.length === 0 && (
                                <span className="text-xs mt-1 bg-gray-200 dark:bg-gray-600/50 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full w-fit">Unused</span>
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{image.id.substring(7, 19)}</td>
                    <td className="px-6 py-4">{image.size}</td>
                    <td className="px-6 py-4">{new Date(image.created).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <ActionButton title="Remove Image" onClick={() => handleRemove(image.id)} className="bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-500/20 dark:hover:bg-red-500/40 dark:text-red-400" disabled={processing[image.id] || image.containers.length > 0}><Trash2Icon /></ActionButton>
                    </td>
                  </tr>
                  {expandedImage === image.id && (
                     <tr className="bg-gray-100/50 dark:bg-gray-700/20">
                         <td colSpan={6} className="p-4">
                             <div className="pl-12">
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Containers using this image:</h4>
                                <ul className="list-disc list-inside text-gray-600 dark:text-gray-400">
                                    {image.containers.map(name => (
                                        <li key={name} className="flex items-center space-x-2">
                                            <CubeIcon/> <span>{name}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                         </td>
                     </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {isPullModalOpen && <PullImageModal onPull={handlePullImage} onClose={() => setPullModalOpen(false)} />}
    </>
  );
};
