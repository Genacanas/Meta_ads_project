import { Search, SlidersHorizontal } from 'lucide-react';
import styles from './FilterBar.module.css';
import { PAGE_CATEGORIES } from '../constants'; // Import categories

interface FilterBarProps {
    selectedCountry: string;
    onCountryChange: (country: string) => void;
    selectedCategory: string; // New prop
    onCategoryChange: (category: string) => void; // New prop
    onReachChange: (enabled: boolean) => void;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    filterReach?: boolean;
    availableCountries: string[];
}

export function FilterBar({
    selectedCountry,
    onCountryChange,
    selectedCategory,
    onCategoryChange,
    onReachChange,
    searchTerm,
    onSearchChange,
    filterReach,
    availableCountries
}: FilterBarProps) {
    return (
        <div className={styles.container}>
            <div className={styles.leftGroup}>
                <div className={styles.selectWrapper}>
                    <select
                        className={styles.select}
                        value={selectedCountry}
                        onChange={(e) => onCountryChange(e.target.value)}
                    >
                        <option value="All">All Countries</option>
                        {availableCountries.map(country => (
                            <option key={country} value={country}>{country}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.selectWrapper}>
                    <select
                        className={styles.select}
                        value={selectedCategory}
                        onChange={(e) => onCategoryChange(e.target.value)}
                    >
                        <option value="All">All Categories</option>
                        {PAGE_CATEGORIES.map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                </div>

                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={filterReach}
                        onChange={(e) => onReachChange(e.target.checked)}
                    />
                    <span>900k+ Reach</span>
                </label>
            </div>

            <div className={styles.rightGroup}>
                <div className={styles.searchWrapper}>
                    <Search size={16} color="#666" />
                    <input
                        type="text"
                        placeholder="Search pages..."
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
                <button className={styles.filterBtn}>
                    <SlidersHorizontal size={16} />
                </button>
            </div>
        </div>
    );
}
