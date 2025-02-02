/**
 * External dependencies
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * WordPress dependencies
 */
import { useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import Modal from '../';
import type { ModalProps } from '../types';

const noop = () => {};

describe( 'Modal', () => {
	it( 'applies the aria-describedby attribute when provided', () => {
		render(
			<Modal
				aria={ { describedby: 'description-id' } }
				onRequestClose={ noop }
			>
				{ /* eslint-disable-next-line no-restricted-syntax */ }
				<p id="description-id">Description</p>
			</Modal>
		);
		expect( screen.getByRole( 'dialog' ) ).toHaveAttribute(
			'aria-describedby',
			'description-id'
		);
	} );

	it( 'applies the aria-labelledby attribute when provided', () => {
		render(
			<Modal aria={ { labelledby: 'title-id' } } onRequestClose={ noop }>
				{ /* eslint-disable-next-line no-restricted-syntax */ }
				<h1 id="title-id">Modal Title Text</h1>
			</Modal>
		);
		expect( screen.getByRole( 'dialog' ) ).toHaveAccessibleName(
			'Modal Title Text'
		);
	} );

	it( 'prefers the aria label of the title prop over the aria.labelledby prop', () => {
		render(
			<Modal
				title="Modal Title Attribute"
				aria={ { labelledby: 'title-id' } }
				onRequestClose={ noop }
			>
				{ /* eslint-disable-next-line no-restricted-syntax */ }
				<h1 id="title-id">Modal Title Text</h1>
			</Modal>
		);
		expect( screen.getByRole( 'dialog' ) ).toHaveAccessibleName(
			'Modal Title Attribute'
		);
	} );

	it( 'hides the header when the `__experimentalHideHeader` prop is used', () => {
		render(
			<Modal
				title="Test Title"
				__experimentalHideHeader
				onRequestClose={ noop }
			>
				<p>Modal content</p>
			</Modal>
		);
		const dialog = screen.getByRole( 'dialog' );
		const title = within( dialog ).queryByText( 'Test Title' );
		expect( title ).not.toBeInTheDocument();
	} );

	it( 'should call onRequestClose when the escape key is pressed', async () => {
		const user = userEvent.setup();
		const onRequestClose = jest.fn();
		render(
			<Modal onRequestClose={ onRequestClose }>
				<p>Modal content</p>
			</Modal>
		);
		await user.keyboard( '[Escape]' );
		expect( onRequestClose ).toHaveBeenCalled();
	} );

	it( 'should return focus when dismissed by clicking outside', async () => {
		const user = userEvent.setup();
		const ReturnDemo = () => {
			const [ isShown, setIsShown ] = useState( false );
			return (
				<div>
					<button onClick={ () => setIsShown( true ) }>📣</button>
					{ isShown && (
						<Modal onRequestClose={ () => setIsShown( false ) }>
							<p>Modal content</p>
						</Modal>
					) }
				</div>
			);
		};
		render( <ReturnDemo /> );

		const opener = screen.getByRole( 'button' );
		await user.click( opener );
		const modalFrame = screen.getByRole( 'dialog' );
		expect( modalFrame ).toHaveFocus();

		// Disable reason: No semantic query can reach the overlay.
		// eslint-disable-next-line testing-library/no-node-access
		await user.click( modalFrame.parentElement! );
		expect( opener ).toHaveFocus();
	} );

	it( 'should request closing of any non nested modal when opened', async () => {
		const user = userEvent.setup();
		const onRequestClose = jest.fn();

		const DismissAdjacent = () => {
			const [ isShown, setIsShown ] = useState( false );
			return (
				<>
					<Modal onRequestClose={ onRequestClose }>
						<button onClick={ () => setIsShown( true ) }>💥</button>
					</Modal>
					{ isShown && (
						<Modal onRequestClose={ () => setIsShown( false ) }>
							<p>Adjacent modal content</p>
						</Modal>
					) }
				</>
			);
		};
		render( <DismissAdjacent /> );

		await user.click( screen.getByRole( 'button', { name: '💥' } ) );
		expect( onRequestClose ).toHaveBeenCalled();
	} );

	it( 'should support nested modals', async () => {
		const user = userEvent.setup();
		const onRequestClose = jest.fn();

		const NestSupport = () => {
			const [ isShown, setIsShown ] = useState( false );
			return (
				<>
					<Modal onRequestClose={ onRequestClose }>
						<button onClick={ () => setIsShown( true ) }>🪆</button>
						{ isShown && (
							<Modal onRequestClose={ () => setIsShown( false ) }>
								<p>Nested modal content</p>
							</Modal>
						) }
					</Modal>
				</>
			);
		};
		render( <NestSupport /> );

		await user.click( screen.getByRole( 'button', { name: '🪆' } ) );
		expect( onRequestClose ).not.toHaveBeenCalled();
	} );

	it( 'should accessibly hide and show siblings including outer modals', async () => {
		const user = userEvent.setup();

		const AriaDemo = () => {
			const [ isOuterShown, setIsOuterShown ] = useState( false );
			const [ isInnerShown, setIsInnerShown ] = useState( false );
			return (
				<>
					<button onClick={ () => setIsOuterShown( true ) }>
						Start
					</button>
					{ isOuterShown && (
						<Modal
							onRequestClose={ () => setIsOuterShown( false ) }
						>
							<button onClick={ () => setIsInnerShown( true ) }>
								Nest
							</button>
							{ isInnerShown && (
								<Modal
									onRequestClose={ () =>
										setIsInnerShown( false )
									}
								>
									<p>Nested modal content</p>
								</Modal>
							) }
						</Modal>
					) }
				</>
			);
		};
		const { container } = render( <AriaDemo /> );

		// Opens outer modal > hides container.
		await user.click( screen.getByRole( 'button', { name: 'Start' } ) );
		expect( container ).toHaveAttribute( 'aria-hidden', 'true' );

		// Disable reason: No semantic query can reach the overlay.
		// eslint-disable-next-line testing-library/no-node-access
		const outer = screen.getByRole( 'dialog' ).parentElement!;

		// Opens inner modal > hides outer modal.
		await user.click( screen.getByRole( 'button', { name: 'Nest' } ) );
		expect( outer ).toHaveAttribute( 'aria-hidden', 'true' );

		// Closes inner modal > Unhides outer modal and container stays hidden.
		await user.keyboard( '[Escape]' );
		expect( outer ).not.toHaveAttribute( 'aria-hidden' );
		expect( container ).toHaveAttribute( 'aria-hidden', 'true' );

		// Closes outer modal > Unhides container.
		await user.keyboard( '[Escape]' );
		expect( container ).not.toHaveAttribute( 'aria-hidden' );
	} );

	it( 'should render `headerActions` React nodes', async () => {
		render(
			<Modal
				headerActions={ <button>A sweet button</button> }
				onRequestClose={ noop }
			>
				<p>Modal content</p>
			</Modal>
		);
		expect(
			screen.getByText( 'A sweet button', { selector: 'button' } )
		).toBeInTheDocument();
	} );

	describe( 'Focus handling', () => {
		let originalGetClientRects: () => DOMRectList;

		const FocusMountDemo = ( {
			focusOnMount,
		}: Pick< ModalProps, 'focusOnMount' > ) => {
			const [ isShown, setIsShown ] = useState( false );
			return (
				<>
					<button onClick={ () => setIsShown( true ) }>
						Toggle Modal
					</button>
					{ isShown && (
						<Modal
							focusOnMount={ focusOnMount }
							onRequestClose={ () => setIsShown( false ) }
						>
							<p>Modal content</p>
							<a href="https://wordpress.org">
								First Focusable Content Element
							</a>

							<a href="https://wordpress.org">
								Another Focusable Content Element
							</a>
						</Modal>
					) }
				</>
			);
		};

		beforeEach( () => {
			/**
			 * The test environment does not have a layout engine, so we need to mock
			 * the getClientRects method. This ensures that the focusable elements can be
			 * found by the `focusOnMount` logic which depends on layout information
			 * to determine if the element is visible or not.
			 * See https://github.com/WordPress/gutenberg/blob/trunk/packages/dom/src/focusable.js#L55-L61.
			 */
			// @ts-expect-error We're not trying to comply to the DOM spec, only mocking
			window.HTMLElement.prototype.getClientRects = function () {
				return [ 'trick-jsdom-into-having-size-for-element-rect' ];
			};
		} );

		afterEach( () => {
			// Restore original HTMLElement prototype.
			// See beforeEach for details.
			window.HTMLElement.prototype.getClientRects =
				originalGetClientRects;
		} );

		it( 'should focus the Modal dialog by default when `focusOnMount` prop is not provided', async () => {
			const user = userEvent.setup();

			render( <FocusMountDemo /> );

			const opener = screen.getByRole( 'button', {
				name: 'Toggle Modal',
			} );

			await user.click( opener );

			expect( screen.getByRole( 'dialog' ) ).toHaveFocus();
		} );

		it( 'should focus the Modal dialog when `true` passed as value for `focusOnMount` prop', async () => {
			const user = userEvent.setup();

			render( <FocusMountDemo focusOnMount={ true } /> );

			const opener = screen.getByRole( 'button', {
				name: 'Toggle Modal',
			} );

			await user.click( opener );

			expect( screen.getByRole( 'dialog' ) ).toHaveFocus();
		} );

		it( 'should focus the first focusable element in the contents (if found) when `firstContentElement` passed as value for `focusOnMount` prop', async () => {
			const user = userEvent.setup();

			render( <FocusMountDemo focusOnMount="firstContentElement" /> );

			const opener = screen.getByRole( 'button' );

			await user.click( opener );

			expect(
				screen.getByText( 'First Focusable Content Element' )
			).toHaveFocus();
		} );

		it( 'should focus the first element anywhere within the Modal when `firstElement` passed as value for `focusOnMount` prop', async () => {
			const user = userEvent.setup();

			render( <FocusMountDemo focusOnMount="firstElement" /> );

			const opener = screen.getByRole( 'button' );

			await user.click( opener );

			expect(
				screen.getByRole( 'button', { name: 'Close' } )
			).toHaveFocus();
		} );

		it( 'should not move focus when `false` passed as value for `focusOnMount` prop', async () => {
			const user = userEvent.setup();

			render( <FocusMountDemo focusOnMount={ false } /> );

			const opener = screen.getByRole( 'button', {
				name: 'Toggle Modal',
			} );

			await user.click( opener );

			expect( opener ).toHaveFocus();
		} );
	} );
} );
