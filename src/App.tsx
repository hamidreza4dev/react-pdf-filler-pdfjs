import React, { useState } from 'react';
// @ts-ignore
import * as pdfjs from 'pdfjs-dist/build/pdf';
import Modal from './modal';
import { Buffer } from 'buffer';
import FormFiller from './FormFiller';
import { InputObj, XfaNode, AcroNode } from './types';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

function InputObjTableRow({ input, i }: { input: InputObj; i: number }) {
  const [modal, setModal] = useState(false);

  return (
    <>
      <tr className={i % 2 === 0 ? undefined : 'bg-gray-50'}>
        <td className="py-2 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
          {input.dataId}
        </td>
        <td className="py-2 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
          {input.textContent}
        </td>
        <td className="px-3 py-2 text-sm text-gray-500">
          {input.name === 'select' ? (
            <>
              <button
                className={'text-indigo-600 hover:text-indigo-800'}
                onClick={() => setModal(true)}
              >
                {input.name}
              </button>
            </>
          ) : input.xfaOn ? (
            `toggle (${input.xfaOn})`
          ) : (
            input.name
          )}
        </td>
        <td className="px-3 py-2 text-sm text-gray-500">{input.ariaLabel}</td>
      </tr>

      <Modal open={modal} onClose={() => setModal(false)}>
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-3 py-2 text-sm font-medium leading-4 text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          onClick={() =>
            navigator.clipboard.writeText(
              JSON.stringify(input.options, null, 2),
            )
          }
        >
          Copy Output
        </button>

        <code className={'block bg-gray-100 p-2 mt-4'}>
          <pre>{JSON.stringify(input.options, null, 2)}</pre>
        </code>
      </Modal>
    </>
  );
}

function App() {
  const [url, setUrl] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [inputs, setInputs] = useState<InputObj[]>([]);
  const [formType, setFormType] = useState('');
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) {
      return;
    }
    const fileReader = new FileReader();
    fileReader.onload = function (e) {
      if (!e.target?.result) {
        return setError('Failed to read PDF');
      }
      loadPdf(new Uint8Array(e.target.result as ArrayBuffer));
    };
    fileReader.readAsArrayBuffer(file);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadPdf(url);
  }

  async function loadPdf(pdfUrl: string | Uint8Array) {
    setLoading(true);

    try {
      const source =
        typeof pdfUrl === 'string' ? { url: pdfUrl } : { data: pdfUrl };

      const pdfDocument = await pdfjs.getDocument({
        ...source,
        enableXfa: true,
      }).promise;

      setPdfDoc(pdfDocument);

      if (pdfDocument.allXfaHtml) {
        setFormType('xfa');
        setInputs(getAllInputs(pdfDocument.allXfaHtml));
        setOutput(JSON.stringify(pdfDocument.allXfaHtml, null, 2));
      } else {
        setFormType('acro');
        setInputs(getAllAcroInputs(await pdfDocument.getFieldObjects()));
        setOutput(JSON.stringify(await pdfDocument.getFieldObjects(), null, 2));
      }
    } catch (e) {
      console.error(e);
      setError('Could not load pdf, please check browser console');
    }

    setLoading(false);
  }

  async function handleFormSubmit(formData: Record<string, string>) {
    if (!pdfDoc) {
      setError('No PDF document loaded');
      return;
    }

    try {
      // Fill the form fields
      Object.entries(formData).forEach(([dataId, value]) => {
        pdfDoc.annotationStorage.setValue(dataId, { value });
      });

      // Save the document
      const result = await pdfDoc.saveDocument();
      const buffer = Buffer.from(result);
      const pdfBlob = new Blob([buffer], { type: 'application/pdf' });
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // Create download link
      const downloadLink = document.createElement('a');
      downloadLink.href = pdfUrl;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadLink.download = `filled-form-${timestamp}.pdf`;

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(pdfUrl);
    } catch (e) {
      console.error(e);
      setError('Failed to save and download the filled PDF');
    }
  }

  function getAllAcroInputs(baseObj: { [name: string]: AcroNode[] }) {
    const result: InputObj[] = [];
    for (const key in baseObj) {
      for (const node of baseObj[key]) {
        if (!node.type) {
          continue;
        }
        result.push({
          name: node.type,
          dataId: node.id,
          ariaLabel: node.name,
          options: [],
        });
      }
    }
    return result;
  }

  function getAllInputs(node: XfaNode) {
    const inputNodes = ['input', 'textarea', 'select'];
    const result: InputObj[] = [];
    if (inputNodes.includes(node.name)) {
      const item: InputObj = {
        name: node.name,
        dataId: node.attributes.dataId,
        value: node.attributes.value,
        textContent: node.attributes.textContent,
        ariaLabel: node.attributes['aria-label'],
        xfaOn: node.attributes.xfaOn,
      };
      if (node.name === 'select') {
        item.options =
          node.children?.map(child => ({
            label: child.value!,
            value: child.attributes.value!,
          })) || [];
      }
      result.push(item);
    }

    if ('children' in node) {
      result.push(...node.children!.flatMap(child => getAllInputs(child)));
    }

    return result;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-blue-50 py-12 px-4">
        <div className="mx-auto max-w-3xl rounded-lg bg-red-50 p-4">
          <p className="text-red-700">Encountered an error:</p>
          <code className="mt-2 block">
            <pre>{error}</pre>
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 py-12">
      <div className="mx-auto max-w-3xl space-y-8 px-4">
        {!loading && !output ? (
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium text-gray-900">Load PDF Form</h2>
            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="url"
                  className="block text-sm font-medium text-gray-700"
                >
                  PDF URL
                </label>
                <input
                  type="url"
                  name="url"
                  id="url"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Or upload a PDF file
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={onFileChange}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={!url}
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300"
                >
                  Load PDF
                </button>
              </div>
            </form>
          </div>
        ) : loading ? (
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="mt-2 text-sm text-gray-500">Loading PDF...</p>
          </div>
        ) : (
          <>
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                  <h2 className="text-lg font-medium text-gray-900">
                    Form Fields ({formType.toUpperCase()})
                  </h2>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={() => setShowOutput(!showOutput)}
                  >
                    {showOutput ? 'Hide' : 'Show'} Raw Output
                  </button>
                </div>
              </div>
              <div className="mt-8 flex-auto overflow-hidden">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6">
                  <div className="inline-block min-w-full py-2 align-middle">
                    <table className="min-w-full border-separate border-spacing-0">
                      <thead>
                        <tr>
                          <th
                            scope="col"
                            className="sticky top-0 border-b border-gray-300 bg-white bg-opacity-75 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter sm:pl-6"
                          >
                            ID
                          </th>
                          <th
                            scope="col"
                            className="sticky top-0 border-b border-gray-300 bg-white bg-opacity-75 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter sm:pl-6"
                          >
                            Content
                          </th>
                          <th
                            scope="col"
                            className="sticky top-0 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter"
                          >
                            Type
                          </th>
                          <th
                            scope="col"
                            className="sticky top-0 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter"
                          >
                            Label
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {inputs.map((input, i) => (
                          <InputObjTableRow
                            key={input.dataId}
                            input={input}
                            i={i}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <FormFiller inputs={inputs} onSubmit={handleFormSubmit} />

            {showOutput && (
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="text-lg font-medium text-gray-900">
                  Raw Output
                </h3>
                <pre className="mt-4 max-h-96 overflow-auto rounded bg-gray-50 p-4">
                  <code>{output}</code>
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
