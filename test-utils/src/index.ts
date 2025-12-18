import { options } from 'preact';

interface TestOptions {
	__test__previousDebounce?: typeof options.debounceRendering;
	__test__drainQueue?: () => void;
}

/**
 * Setup a rerender function that will drain the queue of pending renders
 */
export function setupRerender(): () => void {
	(options as TestOptions).__test__previousDebounce = options.debounceRendering;
	options.debounceRendering = (cb: () => void) => {
		(options as TestOptions).__test__drainQueue = cb;
	};
	return () =>
		(options as TestOptions).__test__drainQueue &&
		(options as TestOptions).__test__drainQueue!();
}

const isThenable = (value: any): value is PromiseLike<any> =>
	value != null && typeof value.then == 'function';

/** Depth of nested calls to `act`. */
let actDepth = 0;

/**
 * Run a test function, and flush all effects and rerenders after invoking it.
 *
 * Returns a Promise which resolves "immediately" if the callback is
 * synchronous or when the callback's result resolves if it is asynchronous.
 */
export function act(cb: () => void | Promise<void>): Promise<void> {
	if (++actDepth > 1) {
		// If calls to `act` are nested, a flush happens only when the
		// outermost call returns. In the inner call, we just execute the
		// callback and return since the infrastructure for flushing has already
		// been set up.
		//
		// If an exception occurs, the outermost `act` will handle cleanup.
		try {
			const result = cb();
			if (isThenable(result)) {
				return result.then(
					() => {
						--actDepth;
					},
					(e: any) => {
						--actDepth;
						throw e;
					}
				);
			}
		} catch (e) {
			--actDepth;
			throw e;
		}
		--actDepth;
		return Promise.resolve();
	}

	const previousRequestAnimationFrame = options.requestAnimationFrame;
	const rerender = setupRerender();

	let flushes: Array<() => void> = [],
		toFlush: Array<() => void>;

	// Override requestAnimationFrame so we can flush pending hooks.
	options.requestAnimationFrame = (fc: () => void) => {
		flushes.push(fc);
	};

	let err: any;

	const finish = (): void => {
		try {
			rerender();
			while (flushes.length) {
				toFlush = flushes;
				flushes = [];

				toFlush.forEach(x => x());
				rerender();
			}
		} catch (e) {
			if (!err) {
				err = e;
			}
		} finally {
			teardown();
		}

		options.requestAnimationFrame = previousRequestAnimationFrame;
		--actDepth;
	};

	let result: void | Promise<void>;

	try {
		result = cb();
	} catch (e) {
		err = e;
	}

	if (isThenable(result!)) {
		return result!.then(finish, (e: any) => {
			finish();
			throw e;
		});
	}

	// nb. If the callback is synchronous, effects must be flushed before
	// `act` returns, so that the caller does not have to await the result,
	// even though React recommends this.
	finish();
	if (err) {
		throw err;
	}
	return Promise.resolve();
}

/**
 * Teardown test environment and reset preact's internal state
 */
export function teardown(): void {
	if ((options as TestOptions).__test__drainQueue) {
		// Flush any pending updates leftover by test
		(options as TestOptions).__test__drainQueue!();
		delete (options as TestOptions).__test__drainQueue;
	}

	if (typeof (options as TestOptions).__test__previousDebounce != 'undefined') {
		options.debounceRendering = (
			options as TestOptions
		).__test__previousDebounce;
		delete (options as TestOptions).__test__previousDebounce;
	} else {
		options.debounceRendering = undefined;
	}
}
