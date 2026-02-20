
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, X } from 'lucide-react';
import './AddSearchTerm.css';

interface AddSearchTermProps {
    onTermAdded?: () => void;
}

export function AddSearchTerm({ onTermAdded }: AddSearchTermProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [country, setCountry] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [minAdDate, setMinAdDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!country || !searchTerm) {
                throw new Error("Country and Search Term are required.");
            }

            const { error: insertError } = await supabase
                .from('search_terms')
                .insert([
                    {
                        country: country.toUpperCase(),
                        search_term: searchTerm,
                        min_ad_creation_time: minAdDate ? new Date(minAdDate).toISOString() : null,
                    }
                ]);

            if (insertError) throw insertError;

            // Reset form and close
            setCountry('');
            setSearchTerm('');
            setMinAdDate('');
            setIsOpen(false);

            if (onTermAdded) {
                onTermAdded();
            }

            alert('Search term added successfully!');

        } catch (err: any) {
            console.error("Error adding search term:", err);
            setError(err.message || "Failed to add search term");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="add-term-btn"
                title="Add New Search Term"
            >
                <Plus size={20} />
                <span>Add Term</span>
            </button>
        );
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Add New Search Term</h2>
                    <button onClick={() => setIsOpen(false)} className="close-btn">
                        <X size={20} />
                    </button>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="add-term-form">
                    <div className="form-group">
                        <label htmlFor="country">Country (ISO Code)</label>
                        <input
                            type="text"
                            id="country"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            placeholder="e.g. DE, US"
                            required
                            maxLength={2}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="searchTerm">Search Term</label>
                        <input
                            type="text"
                            id="searchTerm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="e.g. Nike, Adidas"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="minAdDate">Min Ad Creation Time (Optional)</label>
                        <input
                            type="date"
                            id="minAdDate"
                            value={minAdDate}
                            onChange={(e) => setMinAdDate(e.target.value)}
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={() => setIsOpen(false)} className="cancel-btn">
                            Cancel
                        </button>
                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? 'Adding...' : 'Add Term'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
