import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatCard from './StatCard';
import { Users } from 'lucide-react';

describe('StatCard', () => {
	it('renders correctly with title and value', () => {
		render(
			<StatCard
				title="Test Title"
				value="1,234"
				icon={<Users />}
				color="indigo"
			/>
		);

		expect(screen.getByText('Test Title')).toBeInTheDocument();
		expect(screen.getByText('1,234')).toBeInTheDocument();
	});

	it('renders subtitle when provided', () => {
		render(
			<StatCard
				title="Test Title"
				value="1,234"
				icon={<Users />}
				color="indigo"
				subtitle="Subtitle text"
			/>
		);

		expect(screen.getByText('Subtitle text')).toBeInTheDocument();
	});
});
